import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const boot=p=>read(p).match(/<script>\s*(\(function\(\).*?)<\/script>/s)[1].trim();
function session(code,{dark=false,session=new Map(),local=new Map(),blocked=false,legacy=false}={}){
  const listeners={},attrs={},meta={},media={matches:dark};let systemChange;
  media[legacy?'addListener':'addEventListener']=(...args)=>{systemChange=args.at(-1);};
  const storage=map=>({getItem:k=>{if(blocked)throw Error('blocked');return map.get(k)??null;},setItem:(k,v)=>{if(blocked)throw Error('blocked');map.set(k,v);}});
  const window={matchMedia:()=>media,addEventListener:(k,v)=>listeners[k]=v,dispatchEvent:()=>{}};
  vm.runInNewContext(code,{window,document:{documentElement:{setAttribute:(k,v)=>attrs[k]=v,getAttribute:k=>attrs[k],style:{}},querySelector:()=>meta},localStorage:storage(local),sessionStorage:storage(session),CustomEvent:class{}});
  return {api:window.MatchlatchAppearance,meta,emit:(k,detail)=>listeners[k]?.({detail}),system:next=>{media.matches=next;systemChange();}};
}
test('About executes the identical early app appearance contract',()=>assert.equal(boot('about.html'),boot('index.html')));
for(const page of ['index.html','about.html']){
  test(page+' light/dark/system, live OS changes, invalid preferences',()=>{
    const x=session(boot(page));assert.equal(x.api.effective(),'light');x.system(true);assert.equal(x.api.effective(),'dark');
    x.api.set('light');x.system(true);assert.equal(x.api.effective(),'light');assert.equal(x.meta.content,'#f8f8f6');
    x.api.set('dark');x.system(false);assert.equal(x.api.effective(),'dark');assert.equal(x.meta.content,'#141714');
    x.api.set('invalid');assert.equal(x.api.get(),'dark');x.api.set('system');assert.equal(x.api.effective(),'light');
  });
  test(page+' account choice, account switch and signout stay scoped',()=>{
    const local=new Map(),x=session(boot(page),{local});x.emit('matchlatch:auth-user',{user:{id:'A'}});x.api.set('dark');
    assert.equal(local.get('matchlatch-appearance-v1-A'),'dark');x.emit('matchlatch:auth-user',{user:{id:'B'}});assert.equal(x.api.get(),'system');
    x.emit('matchlatch:auth-user',{user:{id:'A'}});assert.equal(x.api.get(),'dark');x.emit('matchlatch:auth-user',{});assert.equal(x.api.get(),'system');
  });
  test(page+' blocked storage and legacy media listener work',()=>{
    const x=session(boot(page),{blocked:true,legacy:true});x.system(true);assert.equal(x.api.effective(),'dark');x.api.set('light');assert.equal(x.api.effective(),'light');
  });
}
test('app → About → app preserves same-tab appearance, including cached pages',()=>{
  const shared=new Map(),app=session(boot('index.html'),{session:shared});app.api.set('dark');
  const about=session(boot('about.html'),{session:shared});assert.equal(about.api.effective(),'dark');about.api.set('light');
  app.emit('pageshow');assert.equal(app.api.effective(),'light');assert.deepEqual([...shared.keys()],['matchlatch-appearance-session-v1']);
  assert.equal(session(boot('about.html')).api.get(),'system','independent session defaults to system');
});
test('About has theme tokens, no-JS system fallback and visible keyboard focus',()=>{
  const html=read('about.html');assert.match(html,/:root\{color-scheme:light/);assert.match(html,/:root\[data-theme="dark"\]/);
  assert.match(html,/@media\(prefers-color-scheme:dark\)/);assert.match(html,/:root:not\(\[data-theme\]\)/);
  assert.match(html,/background:var\(--bg\)/);assert.match(html,/background:var\(--panel\)/);assert.match(html,/a:focus-visible\{outline:2px solid currentColor/);
});
