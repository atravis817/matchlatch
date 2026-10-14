import {STUDIO_PERMISSIONS} from '../lib/shopify-discovery.mjs';
import {allowRequest} from '../lib/request-limits.mjs';
import {json,session,staffAccess,retrieveCatalog,database,clean,SLOTS} from '../lib/catalog-server.mjs';
import {intentFromText,constrainIntent,rankCandidates,groundedLook,modelJSON,catalogEmptyMessage} from '../lib/styling-engine.mjs';
import {rpc} from '../scripts/awin-bulk.mjs';
import {internalShopifySearch} from '../lib/shopify-internal-catalog.mjs';
import {ownedCandidates} from '../lib/shopify-owned-candidates.mjs';
export async function POST(request){
 if(!allowRequest(request,'style',20))return json({error:'Too many styling requests. Retry shortly.'},429);
 let usageId=null,usage={input_tokens:0,output_tokens:0};
 const meter=async(outcome)=>{if(usageId)await rpc('matchlatch_ai_meter',{p_id:usageId,p_input:usage.input_tokens,p_output:usage.output_tokens,p_outcome:outcome}).catch(()=>{});};
 try{
  if(process.env.VERCEL_ENV!=='preview')return json({error:'Styling is available in Preview only.'},503);
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Cross-origin request denied.'},403);
  const account=await session(request);if(!account)return json({error:'Sign in to personalize or save a look.'},401);
  const raw=await request.text();if(raw.length>2250000)return json({error:'Request too large.'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(input.source==='shopify'||input.provider==='shopify_catalog'||input.source==='fixture'||input.provider==='fixture'||input.demo===true)return json({error:STUDIO_PERMISSIONS.reason,permissionStatus:STUDIO_PERMISSIONS,model:null,aiSkipped:'permission_unverified'},403);
  if(input.consent!==true)return json({error:'Choose whether to use your style preferences for this request.'},400);
  const privateInventory=input.private===true;if(privateInventory&&!await staffAccess(account))return json({error:'Staff access required.'},403);
  let profile={};
  if(input.personalize===true){
   const rows=await database('matchlatch_records?select=payload&kind=eq.profile&record_id=eq.preferences&is_deleted=eq.false&user_id=eq.'+encodeURIComponent(account.user.id),{token:account.token});
   const saved=rows[0]?.payload||{};for(const key of ['aesthetic','palette','fit','occasion','climate','budget','notes','topSize','bottomSize','shoeSize','preferredBrands'])profile[key]=clean(saved[key],key==='notes'?210:80);
  }
  if(input.preferences&&typeof input.preferences==='object'&&!Array.isArray(input.preferences)){for(const key of ['topSize','bottomSize','shoeSize','fit','climate','aesthetic','palette','coordination'])if(typeof input.preferences[key]==='string')profile[key]=clean(input.preferences[key],80);}
  // These are request constraints, not persistent profile updates.
  if(input.max!==undefined){const n=Number(input.max);if(!Number.isFinite(n)||n<1||n>10000)return json({error:'Invalid budget.'},400);profile.budget=n;}
  if(input.size)profile.size=clean(input.size,40);
  const query=clean(input.query,500);let intent;try{intent=intentFromText(query,profile);}catch(e){return json({error:e.message},400);}
  const shopifyFirst=process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE==='true';
  if(shopifyFirst&&input.image)return json({error:'Shopify-derived candidate processing with an external model is not enabled.'},403);
  let model=null,visionUsed=false;const image=input.image;
  if(image!==undefined&&image!==null&&(typeof image!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>2200000))return json({error:'Choose a valid resized JPEG.'},400);
  if(image){const signature=Buffer.from(image.split(',')[1],'base64');if(signature[0]!==255||signature[1]!==216||signature[2]!==255)return json({error:'Choose a valid resized JPEG.'},400);}
  // Establish usable, authenticated catalog coverage before reserving money or
  // sending preferences/photos to a model. This endpoint recommends products;
  // general styling conversation continues through its existing separate path.
  const retrieve=async()=>shopifyFirst?(await Promise.all((intent.slots.length?intent.slots:SLOTS).map(slot=>internalShopifySearch({slot,max:intent.budget,size:intent.size||intent.sizes?.[slot]||'',brand:intent.hardBrands&&intent.brands.length===1?intent.brands[0]:'',purpose:'recommendation'})))).flatMap(page=>page.items):retrieveCatalog({max:intent.budget,slot:intent.slots.length===1?intent.slots[0]:'',size:intent.size,brand:intent.hardBrands&&intent.brands.length===1?intent.brands[0]:'',colors:intent.hardColors?intent.colors:[],productType:!intent.outfit&&/\bsneaker\b/.test(intent.query)?'sneaker':'',privateInventory,account});
  const owned=shopifyFirst?ownedCandidates(await database('matchlatch_records?select=record_id,payload&kind=eq.purchases&is_deleted=eq.false&user_id=eq.'+encodeURIComponent(account.user.id)+'&order=updated_at.desc&limit=100',{token:account.token})):[];
  const ranked=rankCandidates([...owned,...await retrieve()],intent).sort((a,b)=>Number(Boolean(b.owned))-Number(Boolean(a.owned)));let candidates=ranked.slice(0,20);
  if(shopifyFirst){candidates=(intent.slots.length?intent.slots:SLOTS).flatMap(slot=>ranked.filter(p=>p.slot===slot).slice(0,3));}
  const aiSkipped=input.ai===true?(shopifyFirst?'shopify_ai_processing_not_authorized':!candidates.length?'no_eligible_catalog':null):null;
  if(input.ai===true&&candidates.length&&!shopifyFirst){
   if(!process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY)return json({error:'AI is unavailable in Preview. Use catalog search while credentials are configured.'},503);
   const quota=await rpc('matchlatch_ai_reserve',{p_user:account.user.id});if(!quota.allowed)return json({error:'Today’s styling limit is reached. Catalog search remains available.'},429);
   usageId=quota.usage_id;if(quota.alert)console.warn('Development AI budget alert: reserved usage reached $3');
   const result=await modelJSON({query,profile,image});usage.input_tokens+=result.usage?.input_tokens||0;usage.output_tokens+=result.usage?.output_tokens||0;model=result.model;visionUsed=Boolean(image);intent=constrainIntent(intent,result.result,profile);
  }
  if(model)candidates=rankCandidates(await retrieve(),intent).slice(0,20);
  let order=shopifyFirst?candidates.map(p=>p.id):[];
  if(model&&candidates.length){const result=await modelJSON({query:intent.query,profile,candidates});order=result.result.ids;usage.input_tokens+=result.usage?.input_tokens||0;usage.output_tokens+=result.usage?.output_tokens||0;}
  let look=groundedLook(candidates,intent,order);
  if(!look.products.length)look.message=shopifyFirst?'No approved Shopify products meet your outfit constraints.':catalogEmptyMessage(intent,{privateInventory});
  if(input.save===true){
   if(!Array.isArray(input.ids)||!input.ids.length||input.ids.length>(shopifyFirst?9:6)||new Set(input.ids).size!==input.ids.length||input.ids.some(id=>!candidates.some(p=>p.id===id)))return json({error:'Selected products must still meet your catalog constraints.'},409);
   const selected=input.ids.map(id=>candidates.find(p=>p.id===id));
   look=groundedLook(selected,intent,input.ids);
   if(look.products.length!==selected.length)return json({error:'The selected look no longer meets your total budget.'},409);
   if(!look.products.length)return json({error:'There are no verified products to save.'},409);
   const id=crypto.randomUUID();
   const payload={id,label:query.slice(0,150),createdAt:new Date().toISOString(),saved:true,mode:model?'ai':'guided',item:{label:query.slice(0,150),category:'catalog',color:''},styleNotes:look.message,budget:intent.budget,pieces:look.products.map(p=>({type:p.slot,slot:p.slot,description:p.title,searchQuery:p.title,target:p.price,priceAtSelection:p.price,shopRef:p.owned?null:{productId:p.productId,variantId:p.variantId,slot:p.slot,provider:p.source==='shopify_storefront'?'shopify_storefront':'awin'},owned:p.owned===true,retailer:p.merchant,productUrl:p.url,productImage:p.image,currency:p.currency,size:p.size,checkedAt:p.checkedAt})),privateInventory};
   await database('matchlatch_records?on_conflict=user_id,kind,record_id',{method:'POST',token:account.token,body:{user_id:account.user.id,kind:'looks',record_id:id,payload,is_deleted:false}});
   look.savedId=id;
  }
  await meter('completed');
  return json({...look,...(shopifyFirst?{outfitSlots:SLOTS.map(slot=>({slot,product:look.products.find(p=>p.slot===slot)||null})),ownedMerchandiseSpend:0}:{}),intent,private:privateInventory,source:shopifyFirst?'shopify_internal':'qualified_awin_catalog',retailerSearchIncluded:false,noMatchReason:look.products.length?null:'no_eligible_catalog_matches',mode:model?'ai':'catalog',model,visionUsed,aiSkipped,aiProcessing:shopifyFirst?false:Boolean(model),personalized:input.personalize===true});
 }catch(e){await meter('failed');console.warn('Styling request failed:',e.name);return json({error:e.status===503?e.message:'Styling is temporarily unavailable. Try catalog search.'},e.status||502);}
}
export const GET=()=>json({error:'Method not allowed'},405);
