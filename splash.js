/* MATCHLATCH V1.1 developer preview splash — reload or header brand click. */
(function(){
"use strict";
const NS="http://www.w3.org/2000/svg";
const mk=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);return n;};
function build(){
 const overlay=document.createElement("div");overlay.className="ml-splash";overlay.setAttribute("aria-hidden","true");
 const inner=document.createElement("div");inner.className="ml-splash-inner";
 const svg=mk("svg",{class:"ml-splash-logo",viewBox:"0 0 252 170",fill:"none","aria-hidden":"true"});
 const white="#e9f0e8",dark="#141b16";
 const shackle=mk("path",{class:"ml-shackle",d:"M55 59V40C55 22.3 68.7 11 86 11C104.3 11 119 25.7 119 44V52",stroke:white,"stroke-width":"12.5","stroke-linecap":"round","stroke-linejoin":"round"});
 svg.append(shackle);
 svg.append(mk("rect",{x:34,y:67,width:106,height:93,rx:12,fill:white}));
 svg.append(mk("path",{d:"M52 145V89H66L87 110L108 89H122V145H105V115L87 131L69 115V145H52Z",fill:dark}));
 const tag=mk("g",{class:"ml-tag-group"});
 tag.append(mk("path",{d:"M139 80C153 89 160 91 172 83C186 73 190 70 199 80C204 86 206 96 210 106",stroke:white,"stroke-width":4,"stroke-linecap":"round","stroke-linejoin":"round"}));
 tag.append(mk("path",{d:"M208 96L228 91C231.9 90 234.3 91.9 235.5 95.6L246 125.5C247.2 129 245.6 132 241.9 133.5L221 143.8C217.4 145.6 214.4 144.4 212.8 140.6L198.2 110.7C196.6 107 198 103.9 201.2 101.4L208 96Z",fill:white}));
 tag.append(mk("circle",{cx:208,cy:106,r:3,fill:dark}));
 tag.append(mk("path",{d:"M216 110L223.2 128L233 123.9",stroke:dark,"stroke-width":4.5,"stroke-linecap":"round","stroke-linejoin":"round"}));
 svg.append(tag);
 const word=document.createElement("div");word.className="ml-splash-word";word.textContent="MATCHLATCH";
 inner.append(svg,word);overlay.append(inner);document.body.append(overlay);
 return overlay;
}
function init(){
 const splash=build(),reduce=window.matchMedia?.("(prefers-reduced-motion: reduce)");
 let timer,clearTimer;
 function play(){
  clearTimeout(timer);clearTimeout(clearTimer);
  splash.classList.remove("is-playing","is-exiting");
  void splash.offsetWidth;
  splash.classList.add("is-playing");
  const duration=reduce?.matches?180:1250;
  timer=setTimeout(()=>{
   splash.classList.add("is-exiting");
   clearTimer=setTimeout(()=>splash.classList.remove("is-playing","is-exiting"),reduce?.matches?0:310);
  },duration);
 }
 window.MatchlatchSplash={play};
 document.querySelectorAll(".site-header .brand-lockup").forEach(link=>link.addEventListener("click",event=>{
  event.preventDefault();play();
 }));
 play();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
