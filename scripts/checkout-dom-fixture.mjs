// Deterministic DOM harness for actual checkout controls; never a provider fixture route.
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import model from '../checkout-model.js';
export function checkoutHarness({beta=true,user='customer',fetcher=()=>{throw Error('Unexpected network');}}={}){
 class Node {
  constructor(tag,text=''){this.tagName=tag;this.textContent=text;this.children=[];this.attrs={};this.value='';this.disabled=false;this.isConnected=true;}
  append(...nodes){this.children.push(...nodes);}replaceChildren(...nodes){for(const child of this.children)child.isConnected=false;this.children=nodes;}setAttribute(k,v){this.attrs[k]=v;}
  setCustomValidity(v){this.validityMessage=v;}reportValidity(){return !this.validityMessage;}
 }
 const events={},document={createElement:tag=>new Node(tag),querySelector:()=>beta?{content:'purchases-disabled'}:null};
 const window={MatchlatchCheckoutModel:model,addEventListener:(name,fn)=>events[name]=fn};
 vm.runInNewContext(readFileSync(new URL('../checkout-experience.js',import.meta.url),'utf8'),{window,document,Intl,Date,URL,AbortSignal,fetch:fetcher});
 const host=new Node('div'),changes=[],hooks={image:()=>new Node('img'),quantity:(id,value)=>changes.push({id,value}),remove:item=>changes.push({removed:item.id}),page:page=>changes.push({page}),review:()=>changes.push({review:true}),cart:()=>{},headers:async()=>({Authorization:'Bearer fixture'}),verify:async()=>{},user:()=>user};
 const nodes=(n=host)=>[n,...n.children.flatMap(c=>nodes(c))],text=()=>nodes().map(n=>n.textContent).join('\n');
 return {window,host,hooks,changes,events,nodes,text};
}
