import test from 'node:test';
import assert from 'node:assert/strict';
import {connectShopifySync} from '../admin-shopify-sync.mjs';
test('owner control performs GET auth check and labels bounded sample without mutation',async()=>{
 const nodes=new Map();for(const name of ['output','review','status','auth','dry','run','candidates'])nodes.set(name,{disabled:false,textContent:'',replaceChildren(){}});
 const root={querySelector:s=>nodes.get(s.match(/data-sync-([a-z]+)/)[1]),querySelectorAll:()=>['status','auth','dry','run','candidates'].map(n=>nodes.get(n))};
 const old=globalThis.fetch;let calls=0;
 globalThis.fetch=async(url,options)=>{calls++;assert.equal(url,'/api/admin-summary?action=shopify-sync-auth');assert.equal(options.method,'GET');assert.equal(options.body,undefined);return Response.json({shop:'synthetic-shop',apiVersion:'2026-10',sampleProducts:5,hasMore:true,requiredReadScopesVerified:true});};
 try{connectShopifySync({root,getSession:async()=>({data:{session:{access_token:'synthetic',user:{id:'synthetic-owner'}}}}),isOwnerView:()=>true});await nodes.get('auth').onclick();assert.equal(calls,1);assert.match(nodes.get('output').textContent,/Bounded sample: 5/);assert.match(nodes.get('output').textContent,/not total inventory/);assert.match(nodes.get('output').textContent,/No sync was run/);}finally{globalThis.fetch=old;}
});
