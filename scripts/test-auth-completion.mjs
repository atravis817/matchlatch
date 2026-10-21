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
 return {context,lookup,initial,hydrations,events,requests,root,get subscribed(){return Boolean(listener);},get resumes(){return resumes;},get guest(){return guest;},get links(){return root.children.filter(n=>n.href).length;},emit(id){session=id?{user:{id},access_token:id+'-token'}:null;listener?.(id?'SIGNED_IN':'SIGNED_OUT',session);},async flush(reverse=false){if(reverse)timers.reverse();while(timers.length)timers.shift()();await tick();}};
}

test('Independent: stale hydration cannot resume after signout callback receipt before timer',async()=>{
 const h=await fixture();assert.equal(h.links,1);h.emit(null);h.hydrations[0].resolve();await h.context.ready;const observed={resumes:h.resumes,links:h.links,identity:h.context.activeUser?.id,events:h.events.map(e=>({...e}))};await h.flush();console.log(JSON.stringify({beforeTimer:observed,afterTimer:{identity:h.context.activeUser?.id||null,links:h.links}}));assert.equal(observed.events.filter(e=>e.type==='matchlatch:auth-user').length,0);assert.equal(observed.resumes,0,'stale owner protected action must not resume after signout receipt');assert.equal(h.links,0);
});
test('Independent: owner customer owner switch rejects middle hydration completion',async()=>{
 const h=await fixture();h.emit('synthetic-customer');await h.flush();h.emit('synthetic-owner');await h.flush();assert.equal(h.links,1);assert.equal(h.hydrations.length,3);h.hydrations[1].resolve();await tick();assert.equal(h.resumes,0);h.hydrations[2].resolve();await tick();assert.equal(h.resumes,1);h.hydrations[0].resolve();await h.context.ready;assert.equal(h.resumes,1);assert.equal(h.links,1);
});
test('Independent: queued owner callback superseded by signout never hydrates owner',async()=>{
 const h=await fixture({lookupPending:true});h.emit('synthetic-owner');h.emit(null);await h.flush();assert.equal(h.links,0);assert.deepEqual(h.hydrations.map(x=>x.id),[null]);h.lookup.resolve(h.initial);await h.context.ready;assert.equal(h.context.activeUser,null);
});
test('Independent: delayed failed lookup after owner event preserves owner shortcut',async()=>{
 const h=await fixture({lookupPending:true});h.emit('synthetic-owner');await h.flush();h.lookup.reject(new Error('synthetic'));await h.context.ready;assert.equal(h.links,1);assert.equal(h.guest,0);h.hydrations[0].resolve();await tick();assert.equal(h.resumes,1);
});

test('Independent: stale hydration cannot resume after customer switch receipt before timer',async()=>{
 const h=await fixture();h.emit('synthetic-customer');h.hydrations[0].resolve();await h.context.ready;const count=h.resumes;assert.equal(h.events.filter(e=>e.type==='matchlatch:auth-user').length,0);await h.flush();assert.equal(h.context.activeUser.id,'synthetic-customer');assert.equal(h.links,0);assert.equal(count,0,'old owner completion must be invalid on account-switch receipt');
});

 test('Same-account receipt before hydration completion preserves valid completion and dedup',async()=>{
 const h=await fixture();h.emit('synthetic-owner');h.hydrations[0].resolve();await h.context.ready;assert.equal(h.resumes,1);assert.equal(h.events.filter(e=>e.type==='matchlatch:auth-user').length,1);await h.flush();assert.equal(h.hydrations.length,1);assert.equal(h.resumes,1);assert.equal(h.links,1);
 });

test('Reversed queued callbacks apply only newest identity and deny old completion',async()=>{
 const h=await fixture();h.emit(null);h.emit('synthetic-owner');h.emit('synthetic-customer');h.hydrations[0].resolve();await h.context.ready;assert.equal(h.resumes,0);assert.equal(h.events.filter(e=>e.type==='matchlatch:auth-user').length,0);await h.flush(true);assert.deepEqual(h.hydrations.map(x=>x.id),['synthetic-owner','synthetic-customer']);assert.equal(h.links,0);h.hydrations[1].resolve();await tick();assert.equal(h.resumes,1);assert.equal(h.context.activeUser.id,'synthetic-customer');
});
