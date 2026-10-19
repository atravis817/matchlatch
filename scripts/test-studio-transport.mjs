import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const tick=()=>new Promise(r=>setImmediate(r));
const plain=v=>JSON.parse(JSON.stringify(v));
// Small DOM fixture executes the shipped scripts, not a copy of their handlers.
class Node {
 constructor(tag,text=''){this.tagName=tag.toUpperCase();this.nodeType=tag==='#text'?3:1;this.textContent=text;this.children=[];this.parentNode=null;this.attrs={};this.value='';this.checked=false;this.disabled=false;this.listeners={};this.className='';this.classList={add:(...v)=>this.className+=' '+v.join(' '),contains:v=>this.className.split(' ').includes(v)};}
 get childNodes(){return this.children;}get firstChild(){return this.children[0];}get nextElementSibling(){const list=this.parentNode?.children||[];return list[list.indexOf(this)+1];}
 append(...ns){for(let n of ns){if(typeof n==='string')n=new Node('#text',n);if(n.parentNode)n.parentNode.children.splice(n.parentNode.children.indexOf(n),1);n.parentNode=this;this.children.push(n);}}
 prepend(...ns){this.append(...ns);this.children.splice(0,0,...this.children.splice(-ns.length));}
 replaceChildren(...ns){this.children.forEach(n=>n.parentNode=null);this.children=[];this.append(...ns);}
 setAttribute(k,v){this.attrs[k]=v;if(k==='type')this.type=v;if(k==='class')this.className=v;}removeAttribute(k){delete this.attrs[k];}
 matches(selector){const match=selector.match(/^([\w-]+)?(?:\[([\w-]+)="([^"]+)"\])?$/);if(selector.startsWith('.'))return this.classList.contains(selector.slice(1));if(selector.startsWith('#'))return this.id===selector.slice(1);return !!match&&(!match[1]||this.tagName===match[1].toUpperCase())&&(!match[2]||(this[match[2]]??this.attrs[match[2]])===match[3]);}
 querySelectorAll(s){return this.children.flatMap(n=>[...(s.split(',').some(v=>n.matches(v.trim()))?[n]:[]),...n.querySelectorAll(s)]);}
 querySelector(s){return this.querySelectorAll(s)[0]||null;}closest(s){return this.matches(s)?this:this.parentNode?.closest(s)||null;}contains(n){return n===this||this.children.some(c=>c.contains(n));}
 addEventListener(type,fn,capture=false){(this.listeners[type]??=[]).push({fn,capture});}
 dispatchEvent(event){event.target??=this;const chain=[];for(let n=this;n;n=n.parentNode)chain.push(n);event.preventDefault=()=>{};event.stopImmediatePropagation=()=>event.stopped=true;
 for(const n of [...chain].reverse())for(const l of n.listeners[event.type]||[])if(l.capture&&!event.stopped)l.fn(event);
 for(const n of chain)for(const l of n.listeners[event.type]||[])if(!l.capture&&!event.stopped)l.fn(event);return true;}
 click(){if(this.disabled)return;this.dispatchEvent({type:'click'});if(this.type==='submit')this.closest('form')?.dispatchEvent({type:'submit'});}
 focus(){this.document.activeElement=this;}reportValidity(){return true;}checkValidity(){return true;}scrollIntoView(){}
}
function fixture({configured=true,legacyReady=false,styleResponse,tokenWait,capabilityResponse}={}){
 const host=new Node('div'),events={},calls=[];let signed=true;const document={activeElement:null,createElement(tag){const n=new Node(tag);n.document=this;return n;},createTextNode(text){const n=new Node('#text',text);n.document=this;return n;},getElementById(id){return id==='catalog-studio'?host:host.querySelector('#'+id);},querySelector(){return null;}};host.document=document;
 const window={MatchlatchLibrary:{isSignedIn:()=>signed,requireAccount(){}},MatchlatchAuth:{client:{auth:{getSession:async()=>{if(tokenWait)await tokenWait();return {data:{session:signed?{access_token:'synthetic-session'}:null}};}}}},addEventListener:(t,f)=>(events[t]??=[]).push(f),dispatchEvent:e=>(events[e.type]||[]).forEach(f=>f(e))};
 const context=vm.createContext({document,window,Event:class {constructor(type){this.type=type;}},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options.detail;}},URLSearchParams,Intl,console,fetch:async(path,opts)=>{
 calls.push({path,opts,body:opts.body?JSON.parse(opts.body):null});
 if(path.includes('capabilities'))return capabilityResponse?capabilityResponse(calls.at(-1)):Response.json({catalogAvailable:true,staff:false,aiReady:legacyReady,userInputAIConfigured:configured});
 if(path!=='/api/style')throw Error('Unexpected request');return styleResponse?styleResponse(calls.at(-1)):Response.json(success());
 }});
 for(const file of ['studio-request.js','studio-input.js','catalog-experience.js','studio-flow.js'])vm.runInContext(read(file),context);
 return {host,document,window,calls,form:host.querySelector('form'),get:id=>document.getElementById(id),styles:()=>calls.filter(c=>c.path==='/api/style'),auth:()=>{signed=false;window.dispatchEvent({type:'matchlatch:auth-user'});}};
}
function success(){return {products:[],mode:'ai',model:'synthetic',aiProcessing:true,visionUsed:false,complete:false,capabilities:{aiScope:'user_input_only',scope:'single_category_search',merchantDataSentToModel:false,photo:false,fit:false,delivery:false,softPreferencesApplied:false}};}
const input={prompt:'blue shirt up to $100',manualPreferences:{max:100,size:'S',occasion:'Work',style:'Casual'},savedDefaults:{max:200},confirmedResolutions:{}};
function consent(f){const n=f.form.querySelectorAll('input[type="checkbox"]').find(n=>n.closest('label').children.some(c=>c.textContent.includes('I consent to send')));n.checked=true;return n;}
function change(n,value){n.value=value;n.dispatchEvent({type:'input'});n.dispatchEvent({type:'change'});}
async function prepare(f,ai=true){await tick();change(f.get('studio-request-prompt'),'blue shirt up to $100');const budget=f.form.querySelector('input[type="number"]');change(budget,'100');if(ai){change(f.get('studio-search-mode'),'ai');change(f.get('studio-beta-code'),'synthetic-beta');}consent(f);f.form.dispatchEvent({type:'change',target:f.form});}
async function submit(f){f.form.dispatchEvent({type:'submit'});await tick();}
function statusNode(f){return f.host.children.find(n=>n.attrs.role==='status');}
function status(f){return statusNode(f).textContent;}
test('real controller reviews without transport; deliberate AI submit sends exact envelope/auth only once',async()=>{
 const f=fixture();await prepare(f);assert.equal(f.styles().length,0);await submit(f);assert.equal(f.styles().length,0);await submit(f);
 assert.equal(f.styles().length,1);const req=f.styles()[0];assert.equal(req.path,'/api/style');assert.equal(req.opts.headers.Authorization,'Bearer synthetic-session');assert.equal(req.opts.headers['Content-Type'],'application/json');
 assert.deepEqual(Object.keys(req.body).sort(),['ai','betaCode','consent','personalize','studioRequest']);assert.equal(req.body.ai,true);assert.equal(req.body.personalize,false);assert.equal(req.body.consent,true);assert.equal(req.body.betaCode,'synthetic-beta');assert.equal(req.body.studioRequest.prompt,'blue shirt up to $100');assert.equal(req.body.studioRequest.manualPreferences.max,'100');assert.equal(req.body.studioRequest.photoContext,undefined);
 assert.match(status(f),/AI checked your reviewed search constraints/);assert.match(status(f),/not a complete outfit/);
});
test('bridge retains all original prompt/manual/default/resolution bytes and blocks missing consent/code/mode/photo',async()=>{
 const f=fixture();await tick();consent(f);const bridge=f.window.MatchlatchCatalogStyle;
 for(const opts of [{},{ai:true,consent:false,betaCode:'synthetic'},{ai:true,consent:true},{ai:true,consent:true,betaCode:'x'.repeat(257)}])assert.throws(()=>bridge.submitCombined(input,opts));
 assert.throws(()=>bridge.submitCombined({...input,photoContext:{useUploadedPhoto:true}},{ai:true,consent:true,betaCode:'synthetic'}));assert.equal(f.styles().length,0);
 await bridge.submitCombined(input,{ai:true,consent:true,betaCode:'synthetic-beta'});assert.deepEqual(f.styles()[0].body.studioRequest,input);
});
test('configured user-only AI never enables photo; legacy aiReady cannot authorize combined AI',async()=>{
 for(const options of [{configured:true,legacyReady:true},{configured:false,legacyReady:true}]){
  const f=fixture(options);await tick();const photo=f.form.querySelector('.studio-photo-consent').querySelector('input');assert.equal(photo.disabled,true);assert.equal(photo.checked,false);f.window.MatchlatchCatalogStyle.fromPhoto();assert.equal(photo.checked,false);
  if(!options.configured){consent(f);assert.throws(()=>f.window.MatchlatchCatalogStyle.submitCombined(input,{ai:true,consent:true,betaCode:'synthetic'}),/not configured/);}
  assert.equal(f.styles().length,0);
 }
});
test('catalog-only is deliberate, no beta/model fields; no automatic AI on load/edit/capabilities/save/resume',async()=>{
 const product={id:'exact-source-variant',title:'Shirt',merchant:'Synthetic',brand:'Synthetic',image:'https://fixture.invalid/image',price:20,currency:'USD'};
 const f=fixture({styleResponse:async req=>Response.json(req.body.save?{savedId:'saved'}:{...success(),products:[product],mode:'catalog',model:null,aiProcessing:false})});await prepare(f,false);await submit(f);await submit(f);
 assert.equal(f.styles().length,1);assert.equal(f.styles()[0].body.ai,false);assert.equal(f.styles()[0].body.betaCode,undefined);assert.match(status(f),/No AI check was confirmed/);
 const save=f.host.querySelectorAll('button').find(n=>n.textContent==='Save this outfit');await save.onclick();assert.equal(f.styles().length,2);assert.equal(f.styles()[1].body.ai,false);assert.equal(f.styles()[1].body.save,true);assert.deepEqual(f.styles()[1].body.ids,['exact-source-variant']);assert.equal(f.styles()[1].body.betaCode,undefined);
 f.window.dispatchEvent({type:'matchlatch:auth-ready'});await tick();assert.equal(f.styles().length,2);change(f.get('studio-request-prompt'),'red shirt up to $100');assert.equal(save.hidden,true);assert.equal(f.styles().length,2);
});
for(const code of [400,401,403,409,413,422,429,502,503])test(`HTTP ${code} preserves editable request and sanitized error with no retry/fallback`,async()=>{
 const f=fixture({styleResponse:async()=>Response.json({error:'secret provider internals',...(code===422?{normalized:{effectiveConstraints:{max:100},softPreferences:{},provenance:{max:'manual'},conflicts:['budget differs'],unsupportedOrUnknown:['unverified_hard_constraint:fit']}}:{})},{status:code})});await prepare(f);await submit(f);await submit(f);
 assert.equal(f.styles().length,1);assert.equal(f.get('studio-request-prompt').value,'blue shirt up to $100');assert.doesNotMatch(status(f),/secret provider/);assert.ok(f.document.activeElement===statusNode(f),'error status receives focus');
 if(code===422)assert.match(f.host.querySelector('.studio-effective-summary').querySelector('[role="status"]').textContent,/Fit cannot be verified/);
 await tick();assert.equal(f.styles().length,1);
});
test('network/abort unknown usage retains inputs and never resubmits',async()=>{
 const f=fixture({styleResponse:async()=>{throw Error('AbortError secret');}});await prepare(f);await submit(f);await submit(f);assert.equal(f.styles().length,1);assert.match(status(f),/Usage may have occurred/);assert.equal(f.get('studio-request-prompt').value,'blue shirt up to $100');
});
test('HTTP200 catalog empty is not AI success; server normalized review is retained',async()=>{
 const normalized={effectiveConstraints:{max:100,slot:'shirt'},softPreferences:{occasion:'Work'},provenance:{max:'manual'},conflicts:[],unsupportedOrUnknown:[]};
 const f=fixture({styleResponse:async()=>Response.json({...success(),normalized,mode:'catalog',model:null,aiProcessing:false,aiSkipped:'no_eligible_catalog'})});await prepare(f);await submit(f);await submit(f);assert.match(status(f),/No AI check was confirmed.*No eligible products/);assert.ok(f.host.querySelector('.studio-effective-summary').querySelector('dl').children.some(n=>n.textContent.includes('From your choices')));
});
test('duplicate suppressed; edit invalidates result/save and late response cannot restore them',async()=>{
 let finish;const f=fixture({styleResponse:()=>new Promise(r=>finish=r)});await prepare(f);await submit(f);await submit(f);await submit(f);assert.equal(f.styles().length,1);change(f.get('studio-request-prompt'),'red shirt up to $100');finish(Response.json({...success(),products:[{id:'stale'}]}));await tick();assert.equal(f.host.querySelector('.catalog-grid').children.length,0);assert.equal(f.host.querySelectorAll('button').find(n=>n.textContent==='Save this outfit').hidden,true);
});
test('account transition clears prompt/manual/beta/consent, rejects late response and makes no AI call',async()=>{
 let finish;const f=fixture({styleResponse:()=>new Promise(r=>finish=r)});await prepare(f);await submit(f);await submit(f);f.auth();finish(Response.json({...success(),products:[{id:'stale'}]}));await tick();assert.equal(f.styles().length,1);assert.equal(f.get('studio-request-prompt').value,'');assert.equal(f.get('studio-beta-code').value,'');assert.equal(f.get('studio-search-mode').value,'catalog');assert.equal(f.form.querySelector('input[type="number"]').value,'200');assert.equal(f.host.querySelector('.catalog-grid').children.length,0);
});
test('account transition while session lookup is pending prevents sending old private inputs',async()=>{
 let gate=null,release;const f=fixture({tokenWait:async()=>{if(gate)await gate;}});await prepare(f);await submit(f);gate=new Promise(r=>release=r);f.form.dispatchEvent({type:'submit'});await tick();f.auth();release();await tick();assert.equal(f.styles().length,0);assert.equal(f.get('studio-beta-code').value,'');
});
test('save409 never replaces exact IDs or displays success',async()=>{
 const product={id:'exact-v',title:'shirt',price:50,currency:'USD'};
 const f=fixture({styleResponse:async req=>req.body.save?Response.json({error:'private internals'},{status:409}):Response.json({...success(),products:[product]})});await prepare(f);await submit(f);await submit(f);const save=f.host.querySelectorAll('button').find(n=>n.textContent==='Save this outfit');await save.onclick();assert.match(status(f),/not saved.*exact selection/);assert.doesNotMatch(status(f),/Look saved|internals/);assert.equal(f.styles().length,2);assert.deepEqual(f.styles()[1].body.ids,['exact-v']);assert.equal(f.styles()[1].body.ai,false);
});
test('late save failure cannot replace status or restore authority after an input edit',async()=>{
 let finish;const f=fixture({styleResponse:async req=>req.body.save?new Promise(r=>finish=r):Response.json({...success(),products:[{id:'exact-v',title:'shirt',price:50,currency:'USD'}]})});await prepare(f);await submit(f);await submit(f);const save=f.host.querySelectorAll('button').find(n=>n.textContent==='Save this outfit');const pending=save.onclick();await tick();change(f.get('studio-request-prompt'),'red shirt up to $100');const before=status(f);finish(Response.json({error:'secret'},{status:409}));await pending;assert.equal(status(f),before);assert.equal(save.hidden,true);assert.equal(f.styles().length,2);
});
test('conflicting budget offers deliberate resolution, preserves both originals and requires review before sending',async()=>{
 const f=fixture();await prepare(f);change(f.form.querySelector('input[type="number"]'),'80');await submit(f);assert.equal(f.styles().length,0);const choices=f.host.querySelector('.studio-resolution-choices');const choice=choices.children.find(n=>n.textContent.startsWith('Use manual choice'));assert.ok(choice);choice.click();assert.equal(f.styles().length,0);await submit(f);assert.equal(f.styles().length,0);await submit(f);assert.equal(f.styles().length,1);const input=f.styles()[0].body.studioRequest;assert.equal(input.prompt,'blue shirt up to $100');assert.equal(input.manualPreferences.max,'80');assert.equal(input.confirmedResolutions.max,'80');
});

for(const stage of ['session','capability'])for(const ai of [false,true])test(`Q-TRANSPORT-01: edit during initial ${stage} permits deliberate ${ai?'AI':'catalog'} after eligible discovery`,async()=>{
 let release;const gate=new Promise(r=>release=r);
 const f=fixture(stage==='session'?{tokenWait:()=>gate}:{capabilityResponse:async()=>{await gate;return Response.json({catalogAvailable:true,userInputAIConfigured:true});}});
 await tick();change(f.get('studio-request-prompt'),'blue shirt up to $100');
 assert.equal(f.styles().length,0);release();await tick();await tick();
 assert.equal(f.calls.filter(c=>c.path.includes('capabilities')).length,1);
 assert.equal(f.window.MatchlatchCatalogStyle.getCapabilities().userInputAIConfigured,true);
 assert.equal(f.styles().length,0);await prepare(f,ai);await submit(f);assert.equal(f.styles().length,0);await submit(f);
 assert.equal(f.styles().length,1);assert.equal(f.styles()[0].body.ai,ai);
});
test('latest capability response wins across auth-ready refresh and ordinary edits',async()=>{
 const pending=[];const f=fixture({capabilityResponse:()=>new Promise(r=>pending.push(r))});await tick();
 f.window.dispatchEvent({type:'matchlatch:auth-ready'});await tick();assert.equal(pending.length,2);
 change(f.get('studio-request-prompt'),'blue shirt up to $100');
 pending[1](Response.json({catalogAvailable:true,userInputAIConfigured:true}));await tick();
 pending[0](Response.json({catalogAvailable:false,userInputAIConfigured:false}));await tick();
 assert.equal(f.window.MatchlatchCatalogStyle.getCapabilities().userInputAIConfigured,true);assert.equal(f.styles().length,0);
});
test('signout rejects prior capability success and latest unavailable response keeps both modes blocked',async()=>{
 const pending=[];const f=fixture({capabilityResponse:()=>new Promise(r=>pending.push(r))});await tick();f.auth();await tick();
 assert.equal(pending.length,2);pending[1](Response.json({catalogAvailable:false,userInputAIConfigured:false}));await tick();
 pending[0](Response.json({catalogAvailable:true,userInputAIConfigured:true}));await tick();
 assert.equal(f.window.MatchlatchCatalogStyle.getCapabilities().userInputAIConfigured,false);
 for(const ai of [false,true])assert.throws(()=>f.window.MatchlatchCatalogStyle.submitCombined(input,{ai,consent:true,betaCode:'synthetic'}));assert.equal(f.styles().length,0);
});
