import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
class Node{
 constructor(){this.children=[];this.hidden=false;this.value='7';this.classList={add(){}};this.dataset={};}
 append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){this.children=nodes;}
 setAttribute(k,v){this[k]=v;}close(){this.open=false;}
}
const settle=()=>new Promise(r=>setImmediate(r));
const metrics={generatedAt:'2026-10-18T12:00:00Z',period:{days:7},sections:{catalog:{status:'unavailable',reason:'Fixture catalog unavailable'},ai:{status:'unavailable',reason:'Fixture AI unavailable'}},unavailable:[],note:'Synthetic aggregates'};
async function fixture({deferSession=false,deferResponse=false,status=200}={}){
 const nodes=new Map(),get=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};get('dashboard').hidden=true;
 let session={user:{id:'synthetic-owner'},access_token:'synthetic-token'},listener,releaseSession,releaseResponse;
 const client={auth:{getSession:()=>deferSession?new Promise(r=>releaseSession=()=>{deferSession=false;r({data:{session}});}):Promise.resolve({data:{session}}),onAuthStateChange:fn=>listener=fn,signOut:async()=>{}}};
 const script=readFileSync(new URL('../admin-dashboard.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace("await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')",'authModule');
 const context={document:{getElementById:get,createElement:()=>new Node(),createTextNode:text=>({textContent:text})},authModule:{createClient:()=>client},connectShopifySync:()=>({reset(){}}),connectShopifyDiagnostic:()=>({reset(){}}),setInterval(){},setTimeout(){},Intl,Date,Number,Object,Error,exportCSV(){},exportJSON(){},fetch:async url=>url==='/api/auth-config'?Response.json({enabled:true}):deferResponse?new Promise(r=>releaseResponse=()=>r(Response.json(metrics,{status}))):Response.json(metrics,{status})};
 vm.createContext(context);const ready=vm.runInContext('(async()=>{'+script+'\nreturn {load};})()',context);
 await settle();
 return {get,ready,switchUser(id){session=id?{user:{id},access_token:'synthetic-other'}:null;listener(id?'SIGNED_IN':'SIGNED_OUT',session);},releaseSession:()=>releaseSession(),releaseResponse:()=>releaseResponse()};
}
test('NAV-11 actual dashboard renders owner aggregate response and leaves unavailable modules truthful',async()=>{
 const h=await fixture();await h.ready;assert.equal(h.get('dashboard').hidden,false);assert.match(h.get('status').textContent,/Some sources unavailable/);assert.equal(h.get('view-title').textContent,'Overview');assert(h.get('content').children.length>0);
});
test('NAV-11 actual dashboard denies nonowner API response without rendering data',async()=>{
 const h=await fixture({status:403});await h.ready;assert.equal(h.get('dashboard').hidden,true);assert.equal(h.get('content').children.length,0);
});
test('NAV-11 actual dashboard clears owner data immediately on account switch',async()=>{
 const h=await fixture();await h.ready;assert.equal(h.get('dashboard').hidden,false);h.switchUser('synthetic-customer');assert.equal(h.get('dashboard').hidden,true);assert.equal(h.get('content').children.length,0);
});
test('NAV-11 actual dashboard rejects pending owner metrics after signout',async()=>{
 const h=await fixture({deferResponse:true});h.switchUser(null);h.releaseResponse();await h.ready;assert.equal(h.get('dashboard').hidden,true);assert.equal(h.get('content').children.length,0);
});
test('NAV-11 actual dashboard ignores owner session completion after account switch',async()=>{
 const h=await fixture({deferSession:true});h.switchUser('synthetic-customer');h.releaseSession();await h.ready;assert.equal(h.get('dashboard').hidden,true);assert.equal(h.get('content').children.length,0);
});
