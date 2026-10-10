import {json,session,staffAccess,retrieveCatalog,database,clean,SLOTS} from '../lib/catalog-server.mjs';
import {intentFromText,constrainIntent,rankCandidates,groundedLook,modelJSON} from '../lib/styling-engine.mjs';
import {rpc} from '../scripts/awin-bulk.mjs';
export async function POST(request){
 let usageId=null,usage={input_tokens:0,output_tokens:0};
 const meter=async(outcome)=>{if(usageId)await rpc('matchlatch_ai_meter',{p_id:usageId,p_input:usage.input_tokens,p_output:usage.output_tokens,p_outcome:outcome}).catch(()=>{});};
 try{
  if(process.env.VERCEL_ENV!=='preview')return json({error:'Styling is available in Preview only.'},503);
  if(request.headers.get('origin')&&request.headers.get('origin')!==new URL(request.url).origin)return json({error:'Cross-origin request denied.'},403);
  const account=await session(request);if(!account)return json({error:'Sign in to personalize or save a look.'},401);
  const raw=await request.text();if(raw.length>2250000)return json({error:'Request too large.'},413);
  let input;try{input=JSON.parse(raw);}catch{return json({error:'Invalid request.'},400);}
  if(input.consent!==true)return json({error:'Choose whether to use your style preferences for this request.'},400);
  const privateInventory=input.private===true;if(privateInventory&&!await staffAccess(account))return json({error:'Staff access required.'},403);
  let profile={};
  if(input.personalize===true){
   const rows=await database('matchlatch_records?select=payload&kind=eq.profile&record_id=eq.preferences&is_deleted=eq.false&user_id=eq.'+encodeURIComponent(account.user.id),{token:account.token});
   const saved=rows[0]?.payload||{};for(const key of ['aesthetic','palette','fit','occasion','climate','budget','notes','topSize','bottomSize','shoeSize','preferredBrands'])profile[key]=clean(saved[key],key==='notes'?210:80);
  }
  // These are request constraints, not persistent profile updates.
  if(input.max!==undefined){const n=Number(input.max);if(!Number.isFinite(n)||n<1||n>10000)return json({error:'Invalid budget.'},400);profile.budget=n;}
  if(input.size)profile.size=clean(input.size,40);
  const query=clean(input.query,500);let intent;try{intent=intentFromText(query,profile);}catch(e){return json({error:e.message},400);}
  let model=null,visionUsed=false;const image=input.image;
  if(image!==undefined&&image!==null&&(typeof image!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(image)||image.length>2200000))return json({error:'Choose a valid resized JPEG.'},400);
  if(input.ai===true){
   if(!process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY)return json({error:'AI is unavailable in Preview. Use catalog search while credentials are configured.'},503);
   const quota=await rpc('matchlatch_ai_reserve',{p_user:account.user.id});if(!quota.allowed)return json({error:'Today’s styling limit is reached. Catalog search remains available.'},429);
   usageId=quota.usage_id;if(quota.alert)console.warn('Development AI budget alert: reserved usage reached $3');
   const result=await modelJSON({query,profile,image});usage.input_tokens+=result.usage?.input_tokens||0;usage.output_tokens+=result.usage?.output_tokens||0;model=result.model;visionUsed=Boolean(image);intent=constrainIntent(intent,result.result,profile);
  }
  let candidates=await retrieveCatalog({max:intent.budget,slot:intent.slots.length===1?intent.slots[0]:'',size:intent.size,brand:intent.hardBrands&&intent.brands.length===1?intent.brands[0]:'',privateInventory,account});
  candidates=rankCandidates(candidates,intent).slice(0,20);let order=[];
  if(model&&candidates.length){const result=await modelJSON({query:intent.query,profile,candidates});order=result.result.ids;usage.input_tokens+=result.usage?.input_tokens||0;usage.output_tokens+=result.usage?.output_tokens||0;}
  let look=groundedLook(candidates,intent,order);
  if(input.save===true){
   if(!Array.isArray(input.ids)||!input.ids.length||input.ids.length>6||new Set(input.ids).size!==input.ids.length||input.ids.some(id=>!candidates.some(p=>p.id===id)))return json({error:'Selected products must still meet your catalog constraints.'},409);
   const selected=input.ids.map(id=>candidates.find(p=>p.id===id));
   look=groundedLook(selected,intent,input.ids);
   if(look.products.length!==selected.length)return json({error:'The selected look no longer meets your total budget.'},409);
   if(!look.products.length)return json({error:'There are no verified products to save.'},409);
   const id=crypto.randomUUID();
   const payload={id,label:query.slice(0,150),createdAt:new Date().toISOString(),saved:true,mode:model?'ai':'guided',item:{label:query.slice(0,150),category:'catalog',color:''},styleNotes:look.message,budget:intent.budget,pieces:look.products.map(p=>({type:p.slot,slot:p.slot,description:p.title,searchQuery:p.title,target:p.price,priceAtSelection:p.price,shopRef:{productId:p.productId,variantId:p.variantId,slot:p.slot,provider:'awin'},retailer:p.merchant,productUrl:p.url,productImage:p.image,currency:p.currency,size:p.size,checkedAt:p.checkedAt})),privateInventory};
   await database('matchlatch_records?on_conflict=user_id,kind,record_id',{method:'POST',token:account.token,body:{user_id:account.user.id,kind:'looks',record_id:id,payload,is_deleted:false}});
   look.savedId=id;
  }
  await meter('completed');
  return json({...look,intent,private:privateInventory,mode:model?'ai':'catalog',model,visionUsed,personalized:input.personalize===true});
 }catch(e){await meter('failed');console.warn('Styling request failed:',e.name);return json({error:e.status===503?e.message:'Styling is temporarily unavailable. Try catalog search.'},e.status||502);}
}
export const GET=()=>json({error:'Method not allowed'},405);
