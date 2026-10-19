import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../api/admin-summary.mjs';
import {createOwnerNavigation} from '../owner-navigation.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const owner='00000000-0000-4000-8000-000000000001',other='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const response=data=>new Response(JSON.stringify(data));
test('capability gate shares UUID authorization and never reads analytics or uses service credentials',async()=>{
 const prior={...process.env},original=globalThis.fetch;
 try{
  Object.assign(process.env,{VERCEL_ENV:'preview',MATCHLATCH_ADMIN_USER_ID:owner,MATCHLATCH_SUPABASE_URL:'https://example.supabase.co',MATCHLATCH_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SERVICE_ROLE_KEY:'mock-never-sent'});
  let user=null,calls=0;globalThis.fetch=async(url,options)=>{calls++;assert.ok(url.endsWith('/auth/v1/user'));assert.equal(options.headers.apikey,'sb_publishable_test');assert.ok(!JSON.stringify(options).includes('mock-never-sent'));return user?response(user):new Response('',{status:401});};
  const req=()=>new Request('https://example.test/api/admin-summary?capability=1',{headers:{authorization:'Bearer '+'a'.repeat(60)}});
  process.env.VERCEL_ENV='production';assert.equal((await GET(req())).status,404);assert.equal(calls,0);
  process.env.VERCEL_ENV='preview';assert.equal((await GET(new Request('https://example.test'))).status,403);assert.equal(calls,0);
  user={id:other,email:'synthetic-owner@example.invalid',email_confirmed_at:'2026-10-11',user_metadata:{role:'owner',username:'ADMIN'}};assert.equal((await GET(req())).status,403);
  user={id:owner,email_confirmed_at:null};assert.equal((await GET(req())).status,403);
  user={id:owner,email_confirmed_at:'2026-10-11',is_anonymous:true};assert.equal((await GET(req())).status,403);
  user={id:owner,email_confirmed_at:'2026-10-11',is_anonymous:false};const good=await GET(req());assert.equal(good.status,200);assert.equal(good.headers.get('cache-control'),'no-store');assert.deepEqual(await good.json(),{commandCenter:true});
  user=null;assert.equal((await GET(req())).status,403);
  process.env.MATCHLATCH_ADMIN_USER_ID='invalid';const before=calls;assert.equal((await GET(req())).status,503);assert.equal(calls,before);
 }finally{globalThis.fetch=original;for(const key of Object.keys(process.env))if(!(key in prior))delete process.env[key];Object.assign(process.env,prior);}
});
class Node{constructor(tag){this.tag=tag;this.children=[];this.isConnected=true;this.events={};}setAttribute(k,v){this[k]=v;}addEventListener(k,v){this.events[k]=v;}append(...children){for(const child of children){child.parent=this;this.children.push(child);}}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}}
const doc={createElement:tag=>new Node(tag)};
function fixture(fetcher=async()=>response({commandCenter:true})){
 let id=owner,session={user:{id:owner},access_token:'mock-owner-session'},listener;
 const nav=createOwnerNavigation({getUserId:()=>id,getSession:async()=>({data:{session}}),fetcher,document:doc,onAuthChange:fn=>{listener=fn;}}),root=new Node('section');
 return {nav,root,setUser(value){id=value;session=value?{user:{id:value},access_token:'mock-session'}:null;listener();}};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));
test('server-recognized owner gets one GreenGlass link without replacing shopping options',async()=>{const f=fixture();const shopping=new Node('button');f.root.append(shopping);f.nav.mount(f.root);await settle();assert.equal(f.root.children.length,2);assert.equal(f.root.children[1].href,'/admin.html');assert.match(f.root.children[1].className,/profile-shortcut/);await f.nav.refresh();assert.equal(f.root.children.length,2);assert.equal(f.root.children[0],shopping);});
test('guest, customer and failed recognition never render the owner link',async()=>{
 const guest=fixture();guest.setUser(null);guest.nav.mount(guest.root);await settle();assert.equal(guest.root.children.length,0);
 for(const fetcher of [async()=>new Response('',{status:403}),async()=>response({commandCenter:false}),async()=>{throw Error('offline');}]){const f=fixture(fetcher);f.setUser(other);f.nav.mount(f.root);await settle();assert.equal(f.root.children.filter(n=>n.href).length,0);}
});
test('logout and account switching remove links and discard delayed owner responses',async()=>{
 let release;const f=fixture(()=>new Promise(resolve=>{release=resolve;}));f.nav.mount(f.root);await settle();f.setUser(null);release(response({commandCenter:true}));await settle();assert.equal(f.root.children.length,0);
 const g=fixture();g.nav.mount(g.root);await settle();assert.equal(g.root.children.length,1);g.setUser(null);assert.equal(g.root.children.length,0);
 let finish;const switched=fixture(()=>new Promise(resolve=>{finish=resolve;}));switched.nav.mount(switched.root);await settle();const oldResponse=finish;switched.setUser(other);await settle();finish(response({commandCenter:false}));oldResponse(response({commandCenter:true}));await settle();assert.equal(switched.root.children.filter(n=>n.href).length,0);
});
test('detached and remounted account menus cannot receive stale links',async()=>{
 let finish;const f=fixture(()=>new Promise(resolve=>{finish=resolve;}));f.nav.mount(f.root);await settle();f.root.isConnected=false;finish(response({commandCenter:true}));await settle();assert.equal(f.root.children.filter(n=>n.href).length,0);
});
function shellFixture(){
 const shell=readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');
 const start=shell.indexOf(' window.MatchlatchOwnerNavigation=createOwnerNavigation({');
 const end=shell.indexOf('\n}).catch(()=>{});',start);assert(start>0&&end>start);
 const handlers=new Map(),root=new Node('section');let id=null,session=null;
 const window={addEventListener(name,fn){const list=handlers.get(name)||[];list.push(fn);handlers.set(name,list);},MatchlatchAuth:{client:{auth:{getSession:async()=>({data:{session}})}}}};
 vm.runInNewContext(shell.slice(start,end),{window,lib:()=>({getUserId:()=>id}),createOwnerNavigation:options=>createOwnerNavigation({...options,document:doc,fetcher:async()=>response({commandCenter:true})}),renderProfileLinks:()=>window.MatchlatchOwnerNavigation.mount(root)});
 return {root,emit(name,next=id){id=next;session=id?{user:{id},access_token:'synthetic'}:null;for(const fn of handlers.get(name)||[])fn();},nav:window.MatchlatchOwnerNavigation};
}
test('NAV-11 actual shell recognizes owner before cloud hydration completes',async()=>{
 const h=shellFixture();h.emit('matchlatch:auth-transition',owner);await settle();
 assert.equal(h.root.children.filter(n=>n.href==='/admin.html').length,1);
 // No auth-user/cloud completion event was sent.
});
test('NAV-11 actual shell removes old owner link synchronously before signout cloud await',async()=>{
 const h=shellFixture();h.emit('matchlatch:auth-user',owner);await settle();assert.equal(h.root.children.length,1);
 h.emit('matchlatch:auth-transition',null);assert.equal(h.root.children.length,0);
});
test('NAV-11 auth-ready recovers a menu mounted before account tools exist',async()=>{
 const h=shellFixture();h.emit('matchlatch:auth-ready',owner);await settle();assert.equal(h.root.children.filter(n=>n.href==='/admin.html').length,1);
});
test('NAV-11 recognition loading and unavailable states are truthful and deliberately recoverable',async()=>{
 let finish,calls=0;const h=fixture(()=>{calls++;return new Promise(resolve=>finish=resolve);});h.nav.mount(h.root);
 assert.match(h.root.children[0].children[0].textContent,/Checking owner/);await settle();
 finish(new Response('',{status:503}));await settle();assert.equal(h.root.children.filter(n=>n.href).length,0);
 const retry=h.root.children[0].children.find(n=>n.tag==='button');assert.match(retry.textContent,/Check owner access/);
 retry.events.click();await settle();finish(response({commandCenter:true}));await settle();assert.equal(calls,2);assert.equal(h.root.children[0].href,'/admin.html');
});
test('NAV-11 late error after account transition cannot add owner status to guest menu',async()=>{
 let fail;const h=fixture(()=>new Promise((_,reject)=>fail=reject));h.nav.mount(h.root);await settle();h.setUser(null);fail(Error('private upstream detail'));await settle();assert.equal(h.root.children.length,0);
});
