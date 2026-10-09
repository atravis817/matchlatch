/* MATCHLATCH focused screens · no duplicate saved state, no framework.
 * Existing Studio form and results are reused as separate accessible views.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const views=new Set(["home","piece","style","look"]);
const root=$("screen-studio"),form=$("studio"),results=$("results");
if(!root||!form||!results)return;
const bar=document.createElement("div");bar.id="studio-flow-header";bar.className="container flow-header";
bar.setAttribute("aria-label","Studio progress");
root.insertBefore(bar,document.querySelector("#screen-studio > .intro"));
const footer=document.createElement("div");footer.className="studio-next";footer.id="studio-next";
form.after(footer);
const note=document.createElement("p");note.id="studio-flow-message";note.className="studio-flow-message";note.setAttribute("role","status");
const newButton=(label,action,cls="flow-action")=>{
 const b=document.createElement("button");b.type="button";b.className=cls;b.textContent=label;
 b.addEventListener("click",action);return b;
};
const route=()=>{const parts=(location.hash||"").replace("#","").split("/");return parts[0]==="studio"&&views.has(parts[1])?parts[1]:"home";};
let current="home";
const validLook=()=>results.style.display!=="none"&&Boolean($("found-title")?.textContent?.trim());
function open(view="home",push=true){
 if(!views.has(view))view="home";
 if(view==="look"&&!validLook()){
  view="home";
  if(!push&&location.hash==="#studio/look")history.replaceState(null,"","#studio");
 }
 if(view==="piece"&&current!=="style")note.textContent="";
 current=view;
 root.dataset.studioView=view;
 bar.replaceChildren();footer.replaceChildren();
 const headings={piece:["01 / 03","Choose a piece","Upload a photo or describe the item you're styling."],
  style:["02 / 03","Make it yours","Set your look, fit and budget. Extra details are optional."],
  look:["03 / 03","Your look","Fine-tune the outfit, save it, or browse retailer options."]};
 if(view!=="home"){
  const [number,title,description]=headings[view];
  const top=document.createElement("div");top.className="flow-header-top";
  const back=newButton("← "+(view==="piece"?"Studio":view==="style"?"Your piece":"Preferences"),()=>{
   open(view==="piece"?"home":view==="style"?"piece":"style");
  },"flow-back");
  const progress=document.createElement("span");progress.className="flow-progress";progress.textContent=number;
  top.append(back,progress);
  const heading=document.createElement("div");heading.className="flow-heading";
  const h=document.createElement("h1");h.textContent=title;
  const p=document.createElement("p");p.textContent=description;heading.append(h,p);
  bar.append(top,heading);
  if(push){h.tabIndex=-1;queueMicrotask(()=>h.focus({preventScroll:true}));}
  if(view==="piece"){
   const next=newButton("Continue to preferences →",()=>{
    note.textContent="";
    const hasPhoto=Boolean($("preview")?.getAttribute("src"));
    const hasPiece=Boolean($("itemtype")?.value&&$("itemcolor")?.value.trim());
    if(!hasPhoto&&!hasPiece){
     note.textContent="Add a photo, or choose an item type and color to continue.";
     const detail=document.querySelector(".manual-details");
     if(detail&&$("itemtype")?.value)detail.open=true;
     $("drop")?.focus();return;
    }
    open("style");
   },"flow-primary");
   footer.append(next);
  }
  if(view==="style"){
   footer.append(newButton("← Change starting piece",()=>open("piece"),"flow-back"));
   const expl=document.createElement("p");expl.className="flow-guidance";
   expl.textContent="For AI styling, use your photo and testing code. For Guided Styling, describe an item and its color.";
   footer.append(expl);
  }
  if(view==="look"){
   const actions=document.createElement("div");actions.className="flow-header-actions";
   actions.append(newButton("My Closet ↗",()=>window.MatchlatchLibrary?.showPage?.("closet"),"flow-back"));
   footer.append(actions);
  }
 } 
 if(view==="piece")footer.append(note);
 if(push){
  const hash=view==="home"?"#studio":"#studio/"+view;
  if(location.hash!==hash)history.pushState(null,"",hash);
 }
 if(document.getElementById("screen-studio")&&!root.hidden){
  window.scrollTo({top:0,behavior:"auto"});
 }
}
function onPage(event){
 if(event.detail?.page!=="studio")return;
 open(route(),false);
}
window.MatchlatchStudioFlow={open,current:()=>current};
window.addEventListener("matchlatch:page",onPage);
window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#studio"))open(route(),false);});
window.addEventListener("popstate",()=>{if(location.hash.startsWith("#studio"))open(route(),false);});
open(location.hash.startsWith("#studio")?route():"home",false);
document.getElementById("closet-new-look")?.addEventListener("click",()=>window.MatchlatchLibrary?.startFreshStudio?.());
})();

/* Account settings act as independent subpages, not one continuous page. */
(function(){
"use strict";
const root=document.getElementById("screen-account");
if(!root)return;
const pages={home:"Me",appearance:"Appearance",preferences:"My style",account:"My account",privacy:"Privacy & data"};
const bar=document.createElement("div");bar.id="me-page-bar";bar.className="me-page-bar";
const heading=root.querySelector(".library-top");heading?.after(bar);
const route=()=>{
 const parts=(location.hash||"").slice(1).split("/");
 return parts[0]==="me"&&Object.hasOwn(pages,parts[1])?parts[1]:"home";
};
function open(view="home",push=true){
 if(!Object.hasOwn(pages,view))view="home";
 root.dataset.meView=view;
 bar.replaceChildren();
 if(view!=="home"){
  const back=document.createElement("button");back.type="button";back.className="flow-back";
  back.textContent="← Me";back.addEventListener("click",()=>open("home"));
  const h=document.createElement("h1");h.textContent=pages[view];
  const wrap=document.createElement("div");wrap.className="me-page-heading";wrap.append(back,h);
  bar.append(wrap);
  if(push){h.tabIndex=-1;queueMicrotask(()=>h.focus({preventScroll:true}));}
 }
 if(push){
  const hash=view==="home"?"#me":"#me/"+view;
  if(location.hash!==hash)history.pushState(null,"",hash);
 }
 if(!root.hidden)window.scrollTo({top:0,behavior:"auto"});
}
window.MatchlatchMeFlow={open,current:()=>root.dataset.meView||"home"};
window.addEventListener("matchlatch:page",event=>{
 if(event.detail?.page==="account")open(route(),false);
});
window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#me"))open(route(),false);});
window.addEventListener("popstate",()=>{if(location.hash.startsWith("#me"))open(route(),false);});
open(location.hash.startsWith("#me")?route():"home",false);
})();