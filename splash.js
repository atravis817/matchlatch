/* MATCHLATCH V1.1 splash: starts on first paint; JS enables replay. */
(function(){
 "use strict";
 const splash=document.getElementById("matchlatch-splash");
 if(!splash)return;
 let timeout,run=0;
 const reduced=()=>window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 function complete(){
  clearTimeout(timeout);
  splash.classList.remove("is-playing");
  document.body.classList.remove("ml-splash-active");
 }
 function scheduleFallback(){
  clearTimeout(timeout);
  const thisRun=++run;
  timeout=setTimeout(()=>{if(thisRun===run)complete();},reduced()?450:3250);
 }
 function play(){
  clearTimeout(timeout);
  splash.classList.remove("is-playing");
  void splash.offsetWidth;
  splash.classList.add("is-playing");
  document.body.classList.add("ml-splash-active");
  scheduleFallback();
 }
 function init(){
  /* Static splash markup already started its animation before DOMContentLoaded. */
  document.body.classList.add("ml-splash-active");
  splash.addEventListener("animationend",event=>{
   if(event.target===splash)complete();
  });
  document.querySelectorAll(".site-header .brand-lockup").forEach(link=>{
   link.addEventListener("click",event=>{
    event.preventDefault();
    play();
   });
  });
  window.MatchlatchSplash={play};
  scheduleFallback();
 }
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
