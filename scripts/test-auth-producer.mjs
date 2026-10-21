import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createOwnerNavigation} from '../owner-navigation.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
class Node{
 constructor(){this.children=[];this.isConnected=true;}
 setAttribute(){}addEventListener(){}
 append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
 remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
}
const tick=async()=>{for(let i=0;i<4;i++)await new Promise(r=>setImmediate(r));};
async function fixture({lookupPending=false,initialError=false}={}){
 let code=readFileSync(new URL('../library.js',import.meta.url),'utf8');
 code=code.slice(code.indexOf('  let authSwitch=0;'),code.indexOf('  function shopPiece('));
 code=code.replace('import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")','Promise.resolve(authModule)').replace('import("/cloud-sync.js")','Promise.resolve(cloudFixture)');
 const handlers=new Map(),root=new Node(),lookup=deferred(),hydrations=[],events=[],timers=[],requests=[];
 let session={user:{id:'synthetic-owner'},access_token:'synthetic-owner-token'},listener,resumes=0,guest=0;
 const initial={data:{user:session.user},error:initialError?{message:'Synthetic denial'}:null};
 const client={auth:{getUser:()=>lookupPending?lookup.promise:Promise.resolve(initial),getSession:async()=>({data:{session}}),onAuthStateChange(fn){listener=fn;}}};
 const window={dispatchEvent(e){events.push({type:e.type,id:e.detail?.user?.id||null});for(const fn of handlers.get(e.type)||[])fn(e);},addEventListener(type,fn){handlers.set(type,[...(handlers.get(type)||[]),fn]);}};
 const context={window,Event:class{constructor(type){this.type=type;}},CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},console:{warn(){}},setTimeout:fn=>timers.push(fn),activeUser:null,currentLookId:null,selectedLookDetail:null,activePage:'mood',cloudAdapter:null,supabase:null,authModule:{createClient:()=>client},cloudFixture:{createCloudSync:()=>({setUser(user){const d=deferred();hydrations.push({id:user?.id||null,...d});return d.promise;}})},fetch:async()=>Response.json({enabled:true,url:'https://synthetic.test',publishableKey:'synthetic'}),setState(){},setGuest(){guest++;},guestState(){},writePhoto(){},readPhoto(){},loadGuestPhoto(){},clearAccountPhotos(){},resumeProtectedAction(){resumes++;},renderAccount(){},showPage(){},pendingProtectedAction:null};
 vm.createContext(context);vm.runInContext(code+';this.ready=initAuth();',context);
 const nav=createOwnerNavigation({getUserId:()=>context.activeUser?.id,getSession:client.auth.getSession,document:{createElement:()=>new Node()},fetcher:async(_url,options)=>{requests.push(options.headers.Authorization);return Response.json({commandCenter:options.headers.Authorization==='Bearer synthetic-owner-token'});},onAuthChange:fn=>{for(const type of ['matchlatch:auth-transition','matchlatch:auth-ready','matchlatch:auth-user'])window.addEventListener(type,fn);}});nav.mount(root);await tick();
 return {context,lookup,initial,hydrations,events,requests,root,get subscribed(){return Boolean(listener);},get resumes(){return resumes;},get guest(){return guest;},get links(){return root.children.filter(n=>n.href).length;},emit(id){session=id?{user:{id},access_token:id+'-token'}:null;listener?.(id?'SIGNED_IN':'SIGNED_OUT',session);},async flush(){while(timers.length)timers.shift()();await tick();}};
}
test('Q-NAV11 actual producer observes signout during initial hydration',async()=>{
 const h=await fixture();assert.equal(h.links,1);assert(h.subscribed,'SDK listener must exist while cloud waits');h.emit(null);await h.flush();assert.equal(h.context.activeUser,null);assert.equal(h.links,0);assert.equal(h.hydrations.at(-1).id,null);
 h.hydrations[1].resolve();await tick();const count=h.events.length;h.hydrations[0].resolve();await h.context.ready;assert.equal(h.events.length,count);assert.equal(h.resumes,0);
});
test('Q-NAV11 owner to nonowner during pending hydration denies owner shortcut and stale completion',async()=>{
 const h=await fixture();h.emit('synthetic-customer');await h.flush();assert.equal(h.context.activeUser.id,'synthetic-customer');assert.equal(h.links,0);h.hydrations[1].resolve();await tick();const count=h.events.length;h.hydrations[0].resolve();await h.context.ready;assert.equal(h.events.length,count);assert.equal(h.resumes,1);assert.equal(h.links,0);
});
test('Q-NAV11 delayed initial getUser cannot overwrite a newer session',async()=>{
 const h=await fixture({lookupPending:true});assert(h.subscribed);h.emit('synthetic-customer');await h.flush();h.lookup.resolve(h.initial);await h.context.ready;assert.equal(h.context.activeUser.id,'synthetic-customer');assert.deepEqual(h.hydrations.map(x=>x.id),['synthetic-customer']);assert.equal(h.links,0);
});
test('Q-NAV11 callback receipt fences lookup before deferred callback runs',async()=>{
 const h=await fixture({lookupPending:true});assert(h.subscribed);h.emit(null);h.lookup.resolve(h.initial);await h.context.ready;assert.equal(h.context.activeUser,null);assert.equal(h.hydrations.length,0);await h.flush();assert.equal(h.links,0);
});
test('Q-NAV11 latest SDK callback wins before queued work starts',async()=>{
 const h=await fixture({lookupPending:true});assert(h.subscribed);h.emit('synthetic-owner');h.emit(null);h.emit('synthetic-customer');await h.flush();assert.equal(h.context.activeUser.id,'synthetic-customer');assert.deepEqual(h.hydrations.map(x=>x.id),['synthetic-customer']);h.lookup.resolve(h.initial);await h.context.ready;assert.equal(h.links,0);
});
test('Q-NAV11 rejected stale initial lookup does not restore guest over current account',async()=>{
 const h=await fixture({lookupPending:true});assert(h.subscribed);h.emit('synthetic-customer');await h.flush();h.lookup.reject(new Error('Synthetic old lookup failure'));await h.context.ready;assert.equal(h.guest,0);assert.equal(h.context.activeUser.id,'synthetic-customer');
});
test('Q-NAV11 same account token refresh preserves pending cloud work',async()=>{
 const h=await fixture();h.emit('synthetic-owner');await h.flush();assert.equal(h.hydrations.length,1);h.hydrations[0].resolve();await h.context.ready;await tick();assert.equal(h.links,1);assert.equal(h.resumes,1);
});
test('Q-NAV11 initial auth error denies supplied identity',async()=>{
 const h=await fixture({initialError:true});assert.equal(h.context.activeUser,null);assert.equal(h.links,0);h.hydrations[0].resolve();await h.context.ready;
});

test('Q-NAV11 stale initial hydration rejection cannot clear current account',async()=>{
 const h=await fixture();h.emit('synthetic-customer');await h.flush();h.hydrations[0].reject(new Error('Synthetic old hydration failure'));await h.context.ready;assert.equal(h.guest,0);assert.equal(h.context.activeUser.id,'synthetic-customer');assert.equal(h.links,0);
});
