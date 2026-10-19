import test from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../api/style.mjs';
import {mapCatalog} from '../lib/catalog-server.mjs';
import model from '../checkout-model.js';
import {validateSaveSelection} from '../lib/style-save-selection.mjs';
import {intentFromText} from '../lib/styling-engine.mjs';

const row=()=>({advertiser_id:116479,source_variant_id:'save-v',source_product_id:'save-p',slot:'watch',title:'Silver Watch',brand:'Fixture',description:'Steel',color:'silver',size:'',fit:'',material:'steel',image_url:'https://image.example/watch.jpg',product_url:'https://watchesofusa.com/products/watch',affiliate_url:'https://www.awin1.com/pclick.php?p=1&a=3118944&m=116479&ued=https%3A%2F%2Fwatchesofusa.com%2Fproducts%2Fwatch',merchant_host:'watchesofusa.com',merchant_name:'Fixture merchant',currency:'USD',price_usd:50,available:true,is_public:true,stock_status:'1',shipping_us_eligible:true,feed_imported_at:new Date().toISOString(),valid_until:new Date(Date.now()+86400000).toISOString()});

test('actual catalog save409 is unresolved permission/namespace, not failed database persistence',()=>{
 const p=mapCatalog(row());assert.ok(p);assert.equal(p.source,'awin');
 assert.equal(p.merchantId,undefined);assert.equal(p.saveAllowed,undefined);
 assert.equal(model.reference(p),null);assert.equal(model.canSave(p),false);
 // Even a forged row permission cannot manufacture a trusted mapper contract.
 const forged=mapCatalog({...row(),merchantId:'forged',saveAllowed:true});
 assert.equal(model.canSave(forged),false);
});

test('save selection preserves exact permitted identity/options and owned zero spend without granting rights',()=>{
 const intent=intentFromText('watch up to $100');
 const p={...mapCatalog(row()),merchantId:'explicit-fixture-merchant',saveAllowed:true,options:[{name:'Size',value:'M'}]};
 const before=JSON.stringify(p),result=validateSaveSelection([p.id],[p],intent);
 assert.equal(result.error,undefined);assert.equal(result.look.products[0],p);
 assert.deepEqual(model.reference(result.look.products[0]),{provider:'awin',merchantId:p.merchantId,productId:p.productId,variantId:p.variantId});
 assert.equal(JSON.stringify(p),before);
 const owned={...p,id:'owned:synthetic',source:'owned',owned:true,price:0};
 const out=validateSaveSelection([owned.id],[owned],intent);assert.equal(out.look.products[0].price,0);
 for(const patch of [{saveAllowed:false},{saveAllowed:undefined},{evaluationOnly:true},{merchantId:''},{source:'shopify_catalog'},{available:false},{price:101}]){
  const invalid={...p,...patch};assert.ok(validateSaveSelection([p.id],[invalid],intent).error);
 }
 for(const ids of [[],[p.id,p.id],['different-variant'],null,Array(7).fill(p.id)])assert.ok(validateSaveSelection(ids,[p],intent).error);
 // Revalidation after a source change continues to reject a formerly valid selection.
 assert.ok(validateSaveSelection([p.id],[{...p,saveAllowed:false}],intent).error);
});

test('outfit aggregate budget cannot be bypassed by individually affordable products',()=>{
 const p=mapCatalog(row()),intent=intentFromText('complete outfit with a watch up to $100');
 const products=['shirt','pants','shoes','watch'].map(slot=>({...p,id:slot,slot,merchantId:'explicit-fixture',saveAllowed:true}));
 assert.match(validateSaveSelection(products.map(p=>p.id),products,intent).error,/total budget/);
});

for(const ai of [false,true])test(`actual style route rejects denied save before model/meter/write (ai=${ai})`,async()=>{
 const env={...process.env},fetcher=globalThis.fetch,calls=[];
 Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_SHOPIFY_FIRST_PHASE:'false',MATCHLATCH_SUPABASE_URL:'https://fixture.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic',MATCHLATCH_PREVIEW_OPENAI_API_KEY:'synthetic',SUPABASE_SERVICE_ROLE_KEY:'synthetic'});
 globalThis.fetch=async(url,opts={})=>{
  calls.push({url:String(url),method:opts.method||'GET'});
  if(String(url).endsWith('/auth/v1/user'))return Response.json({id:'synthetic-owner',is_anonymous:false});
  if(String(url).includes('/rest/v1/matchlatch_awin_products?'))return Response.json([row()]);
  throw Error('Forbidden model, metering or persistence call');
 };
 try{
  const response=await POST(new Request('https://fixture.test/api/style',{method:'POST',headers:{authorization:'Bearer '+'s'.repeat(60),'x-forwarded-for':'save-preflight-'+ai},body:JSON.stringify({ai,consent:true,save:true,ids:['awin:116479:save-v'],studioRequest:{prompt:'watch up to $100'}})}));
  assert.equal(response.status,409);assert.match((await response.json()).error,/Source save permission or identity is unresolved/);
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.method==='GET'));
 }finally{globalThis.fetch=fetcher;process.env=env;}
});
