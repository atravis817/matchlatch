import {randomUUID} from 'node:crypto';
import {reconcile} from '../lib/shopify-sync.mjs';
import {STORE_DOMAIN} from '../lib/shopify-storefront-adapter.mjs';
export function product(n=1,{price='40.00',quantity=4,variants=1,vendor='Fixture supplier'}={}){
 return {id:'gid://shopify/Product/'+n,title:'Blue T-Shirt '+n,vendor,productType:'T-Shirt',description:'Cotton shirt',status:'ACTIVE',updatedAt:'2026-10-14T03:00:00Z',onlineStoreUrl:'https://'+STORE_DOMAIN+'/products/shirt-'+n,featuredMedia:{preview:{image:{url:'https://cdn.shopify.com/shirt.jpg'}}},variants:{nodes:Array.from({length:variants},(_,i)=>({id:'gid://shopify/ProductVariant/'+(n*100+i),title:'S / Blue',price,inventoryQuantity:quantity,inventoryPolicy:'DENY',inventoryItem:{tracked:true},selectedOptions:[{name:'Size',value:'S'},{name:'Color',value:'Blue'}]})),pageInfo:{hasNextPage:false,endCursor:null}}};
}
// Fixture implementation of the durable store contract. SQL is verified
// separately; these tests cannot establish live DB transactions or RLS.
export class MemoryStore{
 constructor(rows=[]){this.rows=new Map(rows.map(r=>[r.variant_id,structuredClone(r)]));this.jobs=[];this.watermark=null;}
 async claim(input){
  let j=this.jobs.find(j=>j.status!=='succeeded');
  if(j?.status==='running')return {status:'busy'};
  if(j&&j.dry_run!==input.dryRun)return {status:'resume_required'};
  if(!j){const done=this.jobs.find(j=>j.day===input.day&&j.dry_run===input.dryRun);if(done)return structuredClone(done);
   j={id:randomUUID(),worker:input.worker,day:input.day,mode:input.mode,dry_run:input.dryRun,cutoff:input.cutoff,watermark:this.watermark,cursor:null,status:'running',seen:new Set(),examined:0,inserted:0,updated:0,unchanged:0,retired:0};this.jobs.push(j);
  }else{j.worker=input.worker;j.status='running';}
  return structuredClone(j);
 }
 check(input){const j=this.jobs.find(j=>j.id===input.job);if(!j||j.worker!==input.worker||j.status!=='running')throw Error('lease_lost');return j;}
 async commit(input){
  const j=this.check(input);if(j.cursor!==input.expectedCursor)throw Error('checkpoint_mismatch');
  const counts=reconcile([...this.rows.values()],input.rows);for(const k of ['inserted','updated','unchanged'])j[k]+=counts[k];j.examined+=input.rows.length;
  for(const row of input.rows){j.seen.add(row.variant_id);if(!j.dry_run){const prior=this.rows.get(row.variant_id);this.rows.set(row.variant_id,{...row,is_public:prior?.material_hash===row.material_hash&&prior?.retired!==true?prior.is_public:false,approval:prior?.material_hash===row.material_hash&&prior?.retired!==true?prior.approval:{},retired:false});}}
  for(const r of this.rows.values())if(!r.retired&&((input.productIds.includes(r.product_id)&&!input.rows.some(x=>x.variant_id===r.variant_id))||(input.done&&j.mode==='full'&&!j.seen.has(r.variant_id)))){j.retired++;if(!j.dry_run){r.retired=true;r.available=false;r.is_public=false;r.approval={};}}
  j.cursor=input.nextCursor;if(input.done){j.status='succeeded';if(!j.dry_run)this.watermark=j.cutoff;}return structuredClone(j);
 }
 async pause(input){const j=this.check(input);j.status='paused';return structuredClone(j);}
 async fail(input){const j=this.check(input);j.status='failed';return structuredClone(j);}
}
export const readerFor=(products,pageSize=5)=>({async page({cursor}){const offset=Number(cursor||0),nodes=structuredClone(products.slice(offset,offset+pageSize));return {nodes,currency:'USD',pageInfo:{hasNextPage:offset+pageSize<products.length,endCursor:String(offset+pageSize)}};}});
