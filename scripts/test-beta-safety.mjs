import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {GET} from '../api/shop.mjs';
test('Preview blocks checkout verification for Shopify and Awin before provider calls',async()=>{
 const prior=process.env.VERCEL_ENV,fetcher=globalThis.fetch;process.env.VERCEL_ENV='preview';let calls=0;
 globalThis.fetch=async()=>{calls++;throw Error('Checkout must not reach a provider');};
 try{for(const id of ['gid://shopify/p/test','awin:116479:test']){
 const r=await GET(new Request('https://fixture.test/api/shop?mode=verify&id='+encodeURIComponent(id)+'&variant='+encodeURIComponent(id)+'&max=100'));
 assert.equal(r.status,403);assert.equal((await r.json()).code,'BETA_PURCHASES_DISABLED');}assert.equal(calls,0);
 }finally{if(prior===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prior;globalThis.fetch=fetcher;}
});
test('Production retains its existing invalid-reference response rather than the beta guard',async()=>{
 const prior=process.env.VERCEL_ENV;process.env.VERCEL_ENV='production';
 try{const r=await GET(new Request('https://fixture.test/api/shop?mode=verify&id=invalid&variant=invalid&max=100'));assert.equal(r.status,400);assert.notEqual((await r.json()).code,'BETA_PURCHASES_DISABLED');}
 finally{if(prior===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=prior;}
});
test('existing saved retailer items render a disabled beta checkout control',()=>{
 const code=readFileSync(new URL('../library.js',import.meta.url),'utf8');
 const start=code.indexOf('  function verifiedCheckoutAction(item){'),end=code.indexOf('  function renderCheckout',start);
 const node=(tag,cls,text)=>({tag,cls,text,children:[],append(...items){this.children.push(...items);}});
 const btn=(text,fn,cls)=>({...node('button',cls,text),onclick:fn,disabled:false});
 const result=runInNewContext(code.slice(start,end)+'\nverifiedCheckoutAction({shopRef:{provider:"shopify"},retailer:"Fixture retailer"})',
 {document:{querySelector:()=>({content:'purchases-disabled'})},node,btn});
 assert.equal(result.children[0].disabled,true);assert.match(result.children[1].text,/does not offer retailer checkout handoffs/);
});
