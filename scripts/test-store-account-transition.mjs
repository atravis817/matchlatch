import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');
const start=source.indexOf('let storeAccountId=lib()?.getUserId?.()||null;');
const end=source.indexOf('window.addEventListener("matchlatch:retailer-search"',start);
function harness(){
 const handlers=new Map();let user='A',released=0,cleared=0,aborted=0;
 const state={query:'A private query',styleContext:'A private notes',items:[{evaluationOnly:true}],selected:{},criteria:{},exactSize:'A size'};
 const context={window:{addEventListener:(name,fn)=>handlers.set(name,fn)},lib:()=>({getUserId:()=>user}),storeState:state,searchId:7,controller:{abort(){aborted++;}},releaseStoreResearch(){released++;},initialStoreQuery:'private handoff',initialStoreSlot:'shirt',$:()=>({replaceChildren(){cleared++;}}),location:{hash:'#studio'},renderStore(){},renderDestination(){}};
 vm.createContext(context);vm.runInContext(source.slice(start,end),context);
 return {context,state,handlers,switchUser(){user='B';},counts:()=>({released,cleared,aborted})};
}
test('actual auth transition clears old private Store state and hidden DOM before cloud completion',()=>{
 const h=harness();h.switchUser();h.handlers.get('matchlatch:auth-transition')?.({detail:{user:{id:'B'}}});
 assert.equal(h.state.query,'');assert.equal(h.state.styleContext,'');assert.equal(h.state.exactSize,'');assert.equal(h.context.initialStoreQuery,'');assert.equal(h.context.searchId,8);assert.equal(h.counts().cleared,1);assert.equal(h.counts().released,1);assert.equal(h.counts().aborted,1);
 h.handlers.get('matchlatch:auth-user')();assert.equal(h.context.searchId,8,'completion does not resurrect or reapply old state');
});
test('actual navigation invalidates pending research and clears sensitive citation view',()=>{
 const h=harness();h.handlers.get('matchlatch:page')({detail:{page:'studio'}});
 assert.equal(h.context.searchId,8);assert.equal(h.counts().released,1);assert.equal(h.state.items.length,0);
});
test('library emits account transition before awaiting new account cloud state',()=>{
 const s=readFileSync(new URL('../library.js',import.meta.url),'utf8');const a=s.indexOf('    activeUser=nextId?user:null;');
 assert(a>=0);assert(s.indexOf('"matchlatch:auth-transition"',a)<s.indexOf('await cloudAdapter.setUser',a));
});
