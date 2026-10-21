import {classifyProduct} from './fashion-taxonomy.mjs';
// Authenticated user-entered wardrobe records, never merchant stock or orders.
// Missing size/fit is retained as unknown and existing rank constraints exclude
// it when the shopper requires a specific value.
export function ownedCandidates(rows){
 return rows.slice(0,100).flatMap(({record_id,payload:p})=>{
  if(!p||p.source!=='user-entered'||typeof p.description!=='string')return [];
  const classification=classifyProduct({title:p.description});if(classification.reviewRequired||!classification.legacySlot)return [];
  return [{id:'owned:'+record_id,source:'owned',owned:true,productId:'owned:'+record_id,variantId:'owned:'+record_id,title:p.description.slice(0,250),description:'Your user-recorded clothing. Not a verified purchase.',slot:classification.legacySlot,brand:'',merchant:'My Closet',currency:'USD',price:0,available:true,color:typeof p.color==='string'?p.color:'',size:typeof p.size==='string'?p.size:'',fit:typeof p.fit==='string'?p.fit:'',material:'',image:'',url:'',checkedAt:null,nativeCheckoutEligible:false,checkoutEnabled:false,saveAllowed:true}];
 });
}
