import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {intentFromText,groundedLook} from '../lib/styling-engine.mjs';
const source=readFileSync(new URL('../catalog-experience.js',import.meta.url),'utf8');
const build=vm.runInNewContext('('+source.match(/function buildOutfitQuery[^\n]+/)[0]+')');
test('all occasion/style combinations request a complete outfit and retain optional constraints',()=>{
 for(const occasion of ['Everyday','Work','Dinner','Special event'])for(const style of ['Casual','Business casual','Dressy','Help me choose']){
  const query=build(occasion,style,'No red, relaxed fit, black sneakers, under $90');
  assert.ok(query.includes(occasion));assert.ok(query.includes(style));assert.ok(query.includes('No red, relaxed fit, black sneakers, under $90'));
  const intent=intentFromText(query,{budget:120});assert.equal(intent.outfit,true);assert.equal(intent.budget,90);assert.deepEqual(intent.excludedColors,['red']);
 }
 assert.ok(build('Special event','Business casual','x'.repeat(350)).length<=500);
});
test('outfit selection cannot advertise a complete outfit above the total merchandise budget',()=>{
 const products=['shirt','pants','shoes'].map((slot,i)=>({id:String(i),slot,price:45,currency:'USD',title:slot}));
 const look=groundedLook(products,intentFromText(build('Work','Business casual',''),{budget:100}));
 assert.ok(look.total<=100);assert.equal(look.complete,false);
});
test('actual form prevents duplicate requests, shows loading and retains input after an empty result',async()=>{
 class Node {constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.attrs={};this.value='';this.checked=false;this.classList={add(){}};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this.attrs[k]=v;}querySelector(){return null;}replaceChildren(...nodes){this.children=nodes;}reportValidity(){return true;}focus(){} }
 const host=new Node('div'),document={createElement:tag=>new Node(tag),createTextNode:text=>new Node('text',text),getElementById:id=>id==='catalog-studio'?host:null,querySelector:()=>null};
 let calls=0,payload,resolve;
 const response=new Promise(r=>resolve=r);
 const window={MatchlatchLibrary:{isSignedIn:()=>true,requireAccount(){}},MatchlatchStyleProfile:{get:()=>({topSize:'M',shoeSize:'10',fit:'Relaxed'})},addEventListener(){}};
 vm.runInNewContext(source,{document,window,fetch:async(path,opts)=>{if(path.includes('capabilities'))return Response.json({catalogAvailable:false,aiReady:true});calls++;payload=JSON.parse(opts.body);return response;},Response,URLSearchParams,Intl,console});
 const walk=n=>[n,...n.children.flatMap(walk)];const form=walk(host).find(n=>n.tagName==='form'),fields=form.children.filter(n=>n.tagName==='label');
 fields[0].children[0].value='Everyday';fields[1].children[0].value='Casual';fields[2].children[0].value='100';fields.find(n=>n.children.some(c=>c.tagName==='textarea')).children[0].value='No red, black sneakers';fields.find(n=>n.children.some(c=>c.attrs.type==='checkbox')).children[0].checked=true;
 const photoChoice=walk(form).find(n=>n.tagName==='label'&&n.children.some(c=>c.textContent.includes('Use my uploaded photo for this request'))).children[0];await new Promise(r=>setImmediate(r));assert.equal(photoChoice.disabled,true);photoChoice.checked=true;
 const submit=()=>form.onsubmit({preventDefault(){}});await new Promise(r=>setImmediate(r));submit();submit();await new Promise(r=>setImmediate(r));
 const button=form.children.find(n=>n.tagName==='button');assert.equal(calls,1);assert.equal(button.disabled,true);assert.equal(button.textContent,'Finding your outfit…');assert.equal(form.attrs['aria-busy'],'true');assert.equal(payload.ai,true);assert.equal(photoChoice.checked,false);assert.equal(payload.image,undefined);assert.equal(payload.max,100);assert.equal(payload.preferences.topSize,'M');assert.ok(payload.query.includes('No red, black sneakers'));
 resolve(Response.json({products:[],noMatchReason:'no_eligible_catalog_matches',aiSkipped:'no_eligible_catalog',total:0}));await new Promise(r=>setImmediate(r));assert.equal(button.disabled,false);assert.equal(form.attrs['aria-busy'],'false');assert.equal(fields[2].children[0].value,'100');assert.ok(walk(host).some(n=>n.attrs.role==='status'&&n.textContent.includes('Live outfits aren’t available yet')));
});
