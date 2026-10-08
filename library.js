/* MATCHLATCH personal library. Guest data remains on this browser. */
(function () {
  "use strict";
  const STORAGE_KEY = "matchlatch-library-v1";
  const $ = id => document.getElementById(id);
  const esc = value => String(value == null ? "" : value);
  const dateLabel = value => {
    try { return new Date(value).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}); }
    catch { return ""; }
  };
  const money = value => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value)||0);
  const uid = () => crypto.randomUUID ? crypto.randomUUID() : String(Date.now())+"-"+Math.random().toString(36).slice(2);
  const empty = () => ({inspirations:[],looks:[],favorites:[],cart:[],purchases:[],collections:[]});
  let dbState = empty();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw && typeof raw === "object") {
      for (const key of Object.keys(dbState)) if (Array.isArray(raw[key])) dbState[key] = raw[key];
    }
  } catch {}
  let activePage="studio";
  let currentLookId=null;
  let selectedInspiration=null;
  let selectedLookDetail=null;
  let selectedCollectionId=null;
  let supabase=null;
  let activeUser=null;
  let cloudAdapter=null;
  const photoCache = new Map();
  const clone=x=>JSON.parse(JSON.stringify(x));
  const guestState=()=>{
    const state=empty();
    try {
      const raw=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");
      if(raw&&typeof raw==="object")
        Object.keys(state).forEach(k=>{if(Array.isArray(raw[k]))state[k]=raw[k];});
    }catch{}
    return state;
  };
  const setState=state=>{
    const previousLook=currentLookId;
    dbState=clone(state||empty());
    currentLookId=dbState.looks.some(x=>x.id===previousLook)?previousLook:null;
    if(selectedLookDetail&&!dbState.looks.some(x=>x.id===selectedLookDetail))selectedLookDetail=null;
    if(selectedCollectionId&&selectedCollectionId!=="__unfiled__"&&!dbState.collections.some(x=>x.id===selectedCollectionId))selectedCollectionId=null;
    photoCache.clear();
    refreshCounts();
    if(activePage==="styles")renderStyles();
    if(activePage==="cart")renderCart();
    if(activePage==="account")renderAccount();
  };
  const setGuest=()=>{
    activeUser=null;
    setState(guestState());
    window.MatchlatchStyleProfile?.restoreGuest?.();
    if(activePage==="account")renderAccount();
  };

  let toastTimer;
  function feedback(message,actionText,action) {
    let toast=document.getElementById("library-feedback");
    if(!toast) {
      toast=node("div","feedback-toast");toast.id="library-feedback";
      toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");
      document.body.append(toast);
    }
    clearTimeout(toastTimer);toast.replaceChildren();toast.append(node("span",null,message));
    if(actionText && typeof action==="function")toast.append(btn(actionText,()=>{
      clearTimeout(toastTimer);toast.hidden=true;action();
    },"feedback-action"));
    toast.hidden=false;
    toastTimer=setTimeout(()=>toast.hidden=true,4500);
  }
  function persist() {
    try {
      if(activeUser&&cloudAdapter)cloudAdapter.queueState(dbState);
      else localStorage.setItem(STORAGE_KEY,JSON.stringify(dbState));
      refreshCounts();
      return true;
    } catch (error) {
      console.warn("MATCHLATCH could not save local library",error);
      feedback("Storage is unavailable. Your changes may not be saved.");
      return false;
    }
  }

  function openImageDB() {
    return new Promise(resolve => {
      if (!("indexedDB" in window)) { resolve(null); return; }
      let req;
      try {req=indexedDB.open("matchlatch-photos-v1",1);} catch {resolve(null);return;}
      req.onupgradeneeded=()=>{
        if(!req.result.objectStoreNames.contains("photos"))req.result.createObjectStore("photos");
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>resolve(null);
      req.onblocked=()=>resolve(null);
    });
  }
  let databasePromise=openImageDB();
  function photoKey(id) {
    return activeUser?.id&&cloudAdapter
      ? cloudAdapter.accountPhotoKey(activeUser.id,id)
      : "guest-"+id;
  }
  async function writePhoto(key,data) {
    if(!key||!data)return false;
    photoCache.set(key,data);
    const db=await databasePromise;
    if(!db)return false;
    return new Promise(resolve=>{
      try{
        const tx=db.transaction("photos","readwrite");
        tx.objectStore("photos").put(data,key);
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>resolve(false);
      }catch{resolve(false);}
    });
  }
  async function readPhoto(key) {
    if(!key)return null;
    if(photoCache.has(key))return photoCache.get(key);
    const db=await databasePromise;
    if(!db)return null;
    return new Promise(resolve=>{
      try{
        const req=db.transaction("photos","readonly").objectStore("photos").get(key);
        req.onsuccess=()=>{
          const result=typeof req.result==="string"?req.result:null;
          if(result)photoCache.set(key,result);
          resolve(result);
        };
        req.onerror=()=>resolve(null);
      }catch{resolve(null);}
    });
  }
  async function loadGuestPhoto(id) {
    return await readPhoto("guest-"+id) || await readPhoto(id);
  }
  async function savePhoto(id,data) {
    if(!id||!data)return;
    const key=photoKey(id);
    await writePhoto(key,data);
    if(activeUser&&cloudAdapter)cloudAdapter.savePhoto(id);
  }
  async function loadPhoto(id) {
    if(!id)return null;
    if(!activeUser||!cloudAdapter)return loadGuestPhoto(id);
    const local=await readPhoto(photoKey(id));
    if(local)return local;
    const fromCloud=await cloudAdapter.fetchPhoto(id);
    if(fromCloud){await writePhoto(photoKey(id),fromCloud);return fromCloud;}
    return null;
  }
  async function clearAccountPhotos(uid) {
    for(const key of photoCache.keys())if(key.startsWith("account-"+uid+"-"))photoCache.delete(key);
    const db=await databasePromise;
    if(!db)return;
    try {
      await new Promise(resolve=>{
        const tx=db.transaction("photos","readwrite");
        const store=tx.objectStore("photos");
        const cursor=store.openKeyCursor();
        cursor.onsuccess=()=>{
          const item=cursor.result;
          if(!item)return;
          if(String(item.key).startsWith("account-"+uid+"-"))store.delete(item.key);
          item.continue();
        };
        tx.oncomplete=()=>resolve();
        tx.onerror=()=>resolve();
      });
    }catch{}
  }
  async function clearGuestPhotos() {
    for(const id of guestState().inspirations.map(x=>x.id)) {
      photoCache.delete("guest-"+id);photoCache.delete(id);
    }
    const db=await databasePromise;
    if(!db)return;
    try{
      const tx=db.transaction("photos","readwrite");
      for(const id of guestState().inspirations.map(x=>x.id)){
        tx.objectStore("photos").delete("guest-"+id);
        tx.objectStore("photos").delete(id);
      }
    }catch{}
  }
  async function attachPhoto(element,id) {
    const data=await loadPhoto(id);
    if(!data||!element.isConnected)return;
    element.src=data;
    element.alt="Original inspiration photo";
  }
  function imageFrame(id,cls="library-card-photo") {
    const wrap=document.createElement("div");
    wrap.className=cls;
    const img=document.createElement("img");
    img.alt="Original inspiration photo";
    img.loading="lazy";
    wrap.append(img);
    attachPhoto(img,id).then(()=>{
      if(!img.getAttribute("src")&&img.isConnected) {
        img.remove();
        const fallback=document.createElement("span");
        fallback.className="placeholder";
        fallback.textContent=activeUser?"Photo unavailable — reconnect to sync":"Photo unavailable on this device";
        wrap.append(fallback);
      }
    });
    return wrap;
  }
  function node(tag,cls,text) {
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=esc(text);
    return n;
  }
  function btn(label,fn,cls="link-button") {
    const b=node("button",cls,label);
    b.type="button";
    b.addEventListener("click",fn);
    return b;
  }
  function link(query,label="Explore shopping ↗") {
    const a=node("a",null,label);
    a.href="https://www.google.com/search?tbm=shop&q="+encodeURIComponent(esc(query));
    a.rel="noopener noreferrer";
    a.target="_blank";
    return a;
  }
  function lookFor(id) {return dbState.looks.find(x=>x.id===id);}
  function inspirationFor(id) {return dbState.inspirations.find(x=>x.id===id);}
  function currentLook() {return lookFor(currentLookId);}
  function collectionFor(id){return dbState.collections.find(x=>x.id===id);}
  function collectionForInspiration(id){
    const inspiration=inspirationFor(id);
    return inspiration?.collectionId?collectionFor(inspiration.collectionId):null;
  }
  function collectionName(inspirationId){
    return collectionForInspiration(inspirationId)?.name||"Unfiled";
  }
  function createCollection(rawName){
    const name=esc(rawName).replace(/\s+/g," ").trim().slice(0,80);
    if(!name){feedback("Enter a collection name.");return null;}
    const existing=dbState.collections.find(x=>x.name.toLowerCase()===name.toLowerCase());
    if(existing){feedback("That collection already exists. You can add items to it.");return existing.id;}
    const collection={id:uid(),name,createdAt:new Date().toISOString()};
    dbState.collections.unshift(collection);
    persist();feedback("Collection created: "+name);
    return collection.id;
  }
  function assignToCollection(inspirationId,collectionId){
    const inspiration=inspirationFor(inspirationId);
    if(!inspiration)return;
    if(collectionId && !collectionFor(collectionId))return;
    if(collectionId)inspiration.collectionId=collectionId;
    else delete inspiration.collectionId;
    persist();
    feedback(collectionId?"Filed in "+collectionFor(collectionId).name+".":"Moved to Unfiled.");
    if(activePage==="styles")renderStyles();
    if(activePage==="studio")decorateResult(currentLook());
    if(activePage==="cart")renderCart();
  }
  function collectionPicker(inspirationId){
    const container=node("div","collection-control");
    const toggle=btn("Folder: "+collectionName(inspirationId)+" ▾",()=>{
      const expanded=container.querySelector(".collection-editor");
      if(expanded){expanded.remove();toggle.setAttribute("aria-expanded","false");return;}
      const form=document.createElement("form");
      form.className="collection-editor";
      form.setAttribute("aria-label","Organize inspiration into collection");
      const select=document.createElement("select");
      select.setAttribute("aria-label","Choose collection");
      const choices=[
        ["","Unfiled (no folder)"],
        ...dbState.collections.map(x=>[x.id,x.name]),
        ["__new__","＋ New collection…"]
      ];
      for(const [id,title] of choices)select.add(new Option(title,id));
      const current=inspirationFor(inspirationId)?.collectionId||"";
      select.value=collectionFor(current)?current:"";
      const input=document.createElement("input");
      input.type="text";input.maxLength=80;input.placeholder="Collection name";
      input.setAttribute("aria-label","New collection name");
      input.hidden=true;
      select.addEventListener("change",()=>{
        input.hidden=select.value!=="__new__";
        input.required=select.value==="__new__";
        if(!input.hidden)input.focus();
      });
      const controls=node("div","collection-editor-actions");
      const save=node("button","library-primary","Save");
      save.type="submit";
      controls.append(save,btn("Cancel",()=>{form.remove();toggle.setAttribute("aria-expanded","false");},"quiet-button"));
      form.append(select,input,controls);
      form.addEventListener("submit",event=>{
        event.preventDefault();
        const id=select.value==="__new__"?createCollection(input.value):select.value;
        if(id===null)return;
        assignToCollection(inspirationId,id);
        if(activePage!=="styles"){form.remove();toggle.textContent="Folder: "+collectionName(inspirationId)+" ▾";toggle.setAttribute("aria-expanded","false");}
      });
      container.append(form);toggle.setAttribute("aria-expanded","true");
      select.focus();
    },"collection-picker-button");
    toggle.setAttribute("aria-expanded","false");
    container.append(toggle);
    return container;
  }
  function refreshCounts() {
    const c=$("cart-count");
    if(c)c.textContent=dbState.cart.length?String(dbState.cart.length):"";
    const count=$("styles-count");
    if(count)count.textContent=dbState.looks.filter(x=>x.saved).length+dbState.favorites.length || "";
  }

  function showPage(page,updateHash=true) {
    if(!["studio","styles","cart","account"].includes(page))page="studio";
    activePage=page;
    document.querySelectorAll(".app-screen").forEach(section=>section.hidden=section.id!=="screen-"+page);
    document.querySelectorAll(".app-nav button").forEach(button=>{
      const active=button.dataset.page===page;
      button.classList.toggle("active",active);
      if(active)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current");
    });
    if(updateHash && location.hash!=="#"+page)history.pushState(null,"","#"+page);
    if(page==="styles")renderStyles();
    if(page==="cart")renderCart();
    if(page==="account")renderAccount();
    window.scrollTo({top:0,behavior:"auto"});
  }
  function readLocation() {
    const hash=(location.hash||"").replace("#","").split("?")[0].toLowerCase();
    if(["styles","cart","account"].includes(hash))return hash;
    return "studio";
  }
  document.querySelectorAll(".app-nav button").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  document.querySelectorAll("[data-nav-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.navPage)));
  window.addEventListener("hashchange",()=>showPage(readLocation(),false));
  window.addEventListener("popstate",()=>showPage(readLocation(),false));
  refreshCounts();
  showPage(readLocation(),false);

  function captureLook(input,photoData,profile) {
    if(!input||!input.item||!Array.isArray(input.pieces))return;
    const now=new Date().toISOString();
    const inspirationId=uid();
    const lookId=uid();
    const label=esc(input.item.label || "Untitled inspiration").slice(0,150);
    dbState.inspirations.unshift({id:inspirationId,label,createdAt:now});
    const look={
      id:lookId,inspirationId,createdAt:now,label,
      mode:input.mode==="ai"?"ai":"guided",saved:false,
      item:{
        label,category:esc(input.item.category).slice(0,60),
        color:esc(input.item.color).slice(0,60),
        details:esc(input.item.details).slice(0,360)
      },
      styleNotes:esc(input.styleNotes).slice(0,450),
      budget:Number(profile.budget)||200,
      pieces:input.pieces.slice(0,3).map((piece,i)=>({
        type:esc(piece.type).slice(0,70),
        description:esc(piece.description).slice(0,220),
        searchQuery:esc(piece.searchQuery).slice(0,240),
        target:Math.round((Number(profile.budget)||200)*[.38,.37,.25][i])
      }))
    };
    dbState.looks.unshift(look);
    currentLookId=lookId;
    persist();
    if(photoData)void savePhoto(inspirationId,photoData);
    decorateResult(look);
  }

  function favoriteExists(lookId,index) {
    return dbState.favorites.some(x=>x.lookId===lookId&&x.pieceIndex===index);
  }
  function cartExists(lookId,index) {
    return dbState.cart.some(x=>x.lookId===lookId&&x.pieceIndex===index);
  }
  function toggleFavorite(lookId,index) {
    const existing=dbState.favorites.find(x=>x.lookId===lookId&&x.pieceIndex===index);
    if(existing)dbState.favorites=dbState.favorites.filter(x=>x.id!==existing.id);
    else {
      const look=lookFor(lookId),piece=look?.pieces[index];
      if(!piece)return;
      dbState.favorites.unshift({id:uid(),inspirationId:look.inspirationId,lookId,pieceIndex:index,...piece,createdAt:new Date().toISOString()});
    }
    persist();
    if(activePage==="styles")renderStyles();
    if(activePage==="studio")decorateResult(currentLook());
    if(existing)feedback("Removed from favorites.","Undo",()=>{
      if(!dbState.favorites.some(x=>x.id===existing.id))dbState.favorites.unshift(existing);
      persist();if(activePage==="styles")renderStyles();if(activePage==="studio")decorateResult(currentLook());
    });
    else feedback("Saved to favorites.");
  }
  function addToCart(lookId,index) {
    const look=lookFor(lookId),piece=look?.pieces[index];
    if(!piece)return;
    const existing=cartExists(lookId,index);
    if(!existing) {
      dbState.cart.unshift({id:uid(),inspirationId:look.inspirationId,lookId,pieceIndex:index,...piece,createdAt:new Date().toISOString()});
      persist();
    }
    if(activePage==="studio")decorateResult(currentLook());
    if(activePage==="cart")renderCart();
    feedback(existing?"Already in your cart.":"Added to cart.","View cart",()=>showPage("cart"));
  }
  function toggleSaveLook(lookId) {
    const look=lookFor(lookId);
    if(!look)return;
    look.saved=!look.saved;
    persist();
    if(activePage==="studio")decorateResult(currentLook());
    if(activePage==="styles")renderStyles();
    if(look.saved)feedback("Outfit saved.","Your Styles",()=>{selectedTab="outfits";showPage("styles");});
    else feedback("Outfit removed from saved looks.","Undo",()=>{
      look.saved=true;persist();if(activePage==="studio")decorateResult(currentLook());if(activePage==="styles")renderStyles();
    });
  }
  function decorateResult(look) {
    if(!look)return;
    const root=$("look-actions");
    if(root){
      root.replaceChildren();
      root.append(btn(look.saved?"✓ Outfit saved":"♡ Save this outfit",()=>toggleSaveLook(look.id),
        look.saved?"look-action":"look-action primary"));
      root.append(btn("View your styles ↗",()=>showPage("styles"),"look-action"));
    }
    const items=document.querySelectorAll("#suggestions .result-item");
    items.forEach((row,index)=>{
      const left=row.querySelector(".result-item-content");
      if(!left)return;
      left.querySelector(".item-actions")?.remove();
      const actions=node("div","item-actions");
      actions.append(btn(favoriteExists(look.id,index)?"♥ Favorited":"♡ Favorite",()=>toggleFavorite(look.id,index)));
      actions.append(btn(cartExists(look.id,index)?"✓ In cart":"＋ Add to cart",()=>addToCart(look.id,index)));
      left.append(actions);
    });
  }


  function renderCollections(target){
    if(selectedCollectionId){
      const unfiled=selectedCollectionId==="__unfiled__";
      const folder=unfiled?null:collectionFor(selectedCollectionId);
      if(!unfiled&&!folder){selectedCollectionId=null;renderCollections(target);return;}
      const heading=node("div","collection-view-heading");
      const title=node("div");
      title.append(node("div","micro-title","Your personal collection"));
      title.append(node("h2",null,unfiled?"Unfiled":folder.name));
      const actions=node("div","library-actions");
      actions.append(btn("← All collections",()=>{selectedCollectionId=null;renderStyles();},"library-subtle"));
      heading.append(title,actions);target.append(heading);
      if(folder){
        const edit=document.createElement("form");edit.className="collection-rename";
        const input=document.createElement("input");input.type="text";input.value=folder.name;
        input.maxLength=80;input.required=true;input.setAttribute("aria-label","Rename collection");
        const save=node("button","library-subtle","Rename");save.type="submit";
        edit.append(input,save);
        edit.addEventListener("submit",event=>{
          event.preventDefault();
          const next=input.value.replace(/\s+/g," ").trim().slice(0,80);
          if(!next)return;
          if(dbState.collections.some(x=>x.id!==folder.id&&x.name.toLowerCase()===next.toLowerCase())){
            feedback("Another collection already has that name.");return;
          }
          folder.name=next;folder.updatedAt=new Date().toISOString();
          persist();renderStyles();feedback("Collection renamed.");
        });
        actions.append(edit,btn("Delete folder",()=>{
          if(!confirm("Delete the collection “"+folder.name+"”? Photos, outfits, favorites and purchases will stay in Unfiled."))return;
          for(const insp of dbState.inspirations)if(insp.collectionId===folder.id)delete insp.collectionId;
          dbState.collections=dbState.collections.filter(x=>x.id!==folder.id);
          selectedCollectionId=null;persist();renderStyles();
          feedback("Collection removed. Your items are safe in Unfiled.");
        },"quiet-button"));
      }
      const ids=new Set(dbState.inspirations.filter(x=>unfiled?!collectionFor(x.collectionId):x.collectionId===folder.id).map(x=>x.id));
      const counts=[
        ["Inspiration photos",dbState.inspirations.filter(x=>ids.has(x.id)).length,renderInspirations],
        ["Saved outfits",dbState.looks.filter(x=>x.saved&&ids.has(x.inspirationId)).length,renderOutfits],
        ["Favorite items",dbState.favorites.filter(x=>ids.has(x.inspirationId)).length,renderFavorites],
        ["Recorded purchases",dbState.purchases.filter(x=>ids.has(x.inspirationId)).length,renderPurchases]
      ];
      if(!ids.size){
        const empty=node("div","collection-empty");
        empty.append(node("h3",null,"Your collection is ready."));
        empty.append(node("p",null,"Find an inspiration or saved outfit and choose its Folder button to file it here."));
        empty.append(btn("Browse inspirations ↗",()=>{
          selectedTab="inspirations";renderStyles();
        },"library-primary"));
        target.append(empty);return;
      }
      for(const [name,count,render] of counts){
        if(!count)continue;
        const section=node("section","collection-section");
        section.append(node("h3",null,name+" · "+count));
        render(section,ids);target.append(section);
      }
      return;
    }
    const bar=node("div","collections-create");
    const intro=node("div");
    intro.append(node("h2",null,"Your collections."));
    intro.append(node("p",null,"Name a moment, trip, occasion, or idea. Everything attached to each inspiration stays together."));
    const form=document.createElement("form");form.className="collections-create-form";
    const input=document.createElement("input");input.type="text";input.maxLength=80;
    input.required=true;input.placeholder="e.g. Miami 2027 Ideas";
    input.setAttribute("aria-label","New collection name");
    const create=node("button","library-primary","＋ New collection");create.type="submit";
    form.append(input,create);
    form.addEventListener("submit",event=>{
      event.preventDefault();
      const id=createCollection(input.value);
      if(!id)return;
      selectedCollectionId=id;renderStyles();
    });
    bar.append(intro,form);target.append(bar);
    const grid=node("div","collections-grid");
    const folderRows=[...dbState.collections,{id:"__unfiled__",name:"Unfiled",system:true}];
    for(const collection of folderRows){
      const ids=new Set(dbState.inspirations.filter(x=>collection.system?!collectionFor(x.collectionId):x.collectionId===collection.id).map(x=>x.id));
      const looks=dbState.looks.filter(x=>x.saved&&ids.has(x.inspirationId)).length;
      const favorites=dbState.favorites.filter(x=>ids.has(x.inspirationId)).length;
      const purchases=dbState.purchases.filter(x=>ids.has(x.inspirationId)).length;
      const card=btn("",()=>{selectedCollectionId=collection.id;renderStyles();},"collection-card");
      card.setAttribute("aria-label","Open collection "+collection.name);
      card.append(node("span","collection-icon","▣"));
      card.append(node("strong",null,collection.name));
      card.append(node("span","collection-card-meta",
        [ids.size+" inspiration"+(ids.size===1?"":"s"),
        looks+" saved look"+(looks===1?"":"s"),
        favorites+" favorite"+(favorites===1?"":"s"),
        purchases+" purchase"+(purchases===1?"":"s")].join(" · ")));
      card.append(node("span","collection-card-arrow","Open ↗"));
      grid.append(card);
    }
    target.append(grid);
  }

  let selectedTab="collections";
  function renderStyles() {
    const nav=$("styles-tabs");
    const content=$("styles-body");
    nav.replaceChildren();
    content.replaceChildren();
    const tabs=[
      ["collections","Collections",dbState.collections.length],
      ["inspirations","Inspirations",dbState.inspirations.length],
      ["outfits","Saved outfits",dbState.looks.filter(x=>x.saved).length],
      ["favorites","Favorite items",dbState.favorites.length],
      ["purchases","Purchases",dbState.purchases.length]
    ];
    for(const [key,label,count] of tabs){
      const b=btn(label+(count?" · "+count:""),()=>{selectedTab=key;selectedLookDetail=null;renderStyles();},"");
      b.className=selectedTab===key?"active":"";
      b.setAttribute("role","tab");
      b.setAttribute("aria-selected",String(selectedTab===key));
      nav.append(b);
    }
    nav.setAttribute("role","tablist");
    const caption=selectedTab==="collections"
      ? "Organize your original inspiration photos into named collections. Saved looks, favorites and purchases follow their source photos."
      : selectedTab==="purchases"
        ? "Purchases are recorded by you, not verified by retailers. Each record links to its original inspiration."
        : activeUser?"Private account library · Changes sync when connected.":"Guest library · Saved on this device.";
    content.append(node("p","library-caption",caption));
    if(selectedLookDetail)renderLookDetails(content,selectedLookDetail);
    if(selectedTab==="collections")renderCollections(content);
    if(selectedTab==="inspirations")renderInspirations(content);
    if(selectedTab==="outfits")renderOutfits(content);
    if(selectedTab==="favorites")renderFavorites(content);
    if(selectedTab==="purchases")renderPurchases(content);
  }
  function openLookDetails(lookId) {
    selectedLookDetail=lookId;
    showPage("styles");
    const el=$("look-detail");
    if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  }
  async function reopenTree(lookId){
    const look=lookFor(lookId);
    if(!look)return;
    showPage("studio");
    window.MatchlatchResetStudio?.();
    currentLookId=look.id;
    $("result-title").textContent="Your saved outfit.";
    $("mode").textContent=look.mode==="ai"?"AI-CURATED LOOK":"GUIDED LOOK";
    $("found-title").textContent=look.item?.label||look.label;
    $("found-meta").textContent=[look.item?.color,look.item?.category].filter(Boolean).join(" · ");
    $("found-details").textContent=look.item?.details||"";
    $("style-notes").textContent=look.styleNotes||"";
    const photo=$("result-photo");
    const image=await loadPhoto(look.inspirationId);
    if(currentLookId!==lookId)return;
    if(image){photo.src=image;photo.hidden=false;}
    else{photo.removeAttribute("src");photo.hidden=true;}
    $("results").style.display="block";
    $("suggestions").replaceChildren();
    const legacy=$("styling-suggestions");
    if(legacy){legacy.hidden=true;legacy.open=false;}
    decorateResult(look);
    window.MatchlatchShop?.init({mode:look.mode,item:look.item,pieces:look.pieces},
      window.MatchlatchStyleProfile?.get?.()||{},look.shopSelections||{});
    $("results").scrollIntoView({behavior:"smooth",block:"start"});
  }
  function renderLookDetails(target,lookId) {
    const look=lookFor(lookId);
    if(!look){selectedLookDetail=null;return;}
    const detail=node("section","look-detail");
    detail.id="look-detail";
    const top=node("div","look-detail-heading");
    const headings=node("div");
    headings.append(node("div","micro-title","Inspired by your original photo"));
    headings.append(node("h2",null,look.label));
    top.append(headings,btn("Close details ×",()=>{selectedLookDetail=null;renderStyles();},"library-subtle"));
    detail.append(top);
    detail.append(imageFrame(look.inspirationId,"look-detail-photo"));
    if(look.styleNotes)detail.append(node("p","library-meta",look.styleNotes));
    const list=node("div","look-detail-items");
    look.pieces.forEach((piece,index)=>{
      const item=node("div","look-detail-item");
      const text=node("div");
      text.append(node("div","library-meta",piece.type+" · Target "+money(piece.target)));
      text.append(node("strong",null,piece.description));
      const actions=node("div","library-actions");
      actions.append(link(piece.searchQuery));
      actions.append(btn(favoriteExists(look.id,index)?"Remove favorite":"Favorite",()=>{toggleFavorite(look.id,index);renderStyles();}));
      actions.append(btn(cartExists(look.id,index)?"In cart ✓":"Add to cart",()=>{addToCart(look.id,index);renderStyles();}));
      item.append(text,actions);list.append(item);
    });
    detail.append(list);
    const bottom=node("div","library-actions");
    bottom.append(btn("Shop this outfit ↗",()=>void reopenTree(look.id),"library-primary"));
    bottom.append(btn(look.saved?"Remove saved outfit":"Save outfit",()=>toggleSaveLook(look.id)));
    bottom.append(btn("View original photo ↗",()=>{selectedLookDetail=null;focusInspiration(look.inspirationId);}));
    detail.append(bottom);
    target.append(detail);
  }

  function showEmpty(parent,heading,message,buttonLabel="Create a look") {
    const box=node("div","empty-state");
    box.append(node("h3",null,heading),node("p",null,message));
    box.append(btn(buttonLabel,()=>showPage("studio"),"library-primary"));
    parent.append(box);
  }
  function makeCard(inspirationId,title,meta,description) {
    const card=node("article","library-card");
    card.append(imageFrame(inspirationId));
    const body=node("div","library-card-body");
    body.append(node("div","library-meta",meta),node("h3","library-card-title",title));
    if(description)body.append(node("p",null,description));
    card.append(body);
    return {card,body};
  }
  function focusInspiration(id) {
    selectedTab="inspirations";selectedInspiration=id;
    showPage("styles");
    const el=document.getElementById("inspiration-"+id);
    if(el)el.scrollIntoView({behavior:"smooth",block:"center"});
  }
  function renderInspirations(target) {
    if(!dbState.inspirations.length){
      showEmpty(target,"Your inspiration library starts here.","Analyze or style your first photo to see it connected to outfits, favorites and purchases.");
      return;
    }
    const grid=node("div","library-grid");
    for(const insp of dbState.inspirations) {
      const count=dbState.looks.filter(x=>x.inspirationId===insp.id).length;
      const {card,body}=makeCard(insp.id,insp.label,
        dateLabel(insp.createdAt)+" · "+count+" curated look"+(count===1?"":"s"),
        selectedInspiration===insp.id?"This is the original photo linked to your saved looks and purchases.":"");
      card.id="inspiration-"+insp.id;
      const actions=node("div","library-actions");
      actions.append(btn("See associated looks",()=>{
        const linked=dbState.looks.find(x=>x.inspirationId===insp.id);
        if(linked)openLookDetails(linked.id);
      }));
      body.append(actions);
      grid.append(card);
    }
    target.append(grid);
  }
  function renderOutfits(target) {
    const looks=dbState.looks.filter(x=>x.saved);
    if(!looks.length) {
      showEmpty(target,"No saved outfits yet.","After MATCHLATCH builds a look, choose “Save this outfit.” Your original photo will stay connected.");
      return;
    }
    const grid=node("div","library-grid");
    for(const look of looks) {
      const {card,body}=makeCard(look.inspirationId,look.label,
        (look.mode==="ai"?"AI curated":"Guided styling")+" · "+dateLabel(look.createdAt),
        [...(look.shopSelections?Object.values(look.shopSelections).map(x=>x.title):[]),
          ...look.pieces.slice(0,3).map(x=>x.description)].join(" · "));
      const actions=node("div","library-actions");
      actions.append(btn("Open outfit ↗",()=>openLookDetails(look.id)));
      actions.append(btn("Private Shop ↗",()=>void reopenTree(look.id)));
      actions.append(btn("View inspiration ↗",()=>focusInspiration(look.inspirationId)));
      actions.append(btn("Remove saved outfit",()=>toggleSaveLook(look.id),"quiet-button"));
      body.append(actions);
      grid.append(card);
    }
    target.append(grid);
  }
  async function appendLiveShopLink(actions,item) {
    if(!item?.shopRef){actions.append(link(item.searchQuery));return;}
    const status=node("span","library-meta","Checking retailer price…");
    actions.append(status);
    try {
      const qs=new URLSearchParams({mode:"verify",id:item.shopRef.productId,
        variant:item.shopRef.variantId,max:"10000"});
      const response=await fetch("/api/shop?"+qs.toString(),{cache:"no-store"});
      const payload=await response.json();
      if(!actions.isConnected)return;
      status.remove();
      if(response.ok && payload.item?.available && payload.item?.url){
        const a=node("a",null,money(payload.item.price)+" · Open retailer ↗");
        a.href=payload.item.url;a.target="_blank";a.rel="noopener noreferrer";
        actions.append(a);
      } else {
        actions.append(link(item.searchQuery,"Look for alternatives ↗"));
        actions.append(node("span","library-meta","Saved offer no longer verified"));
      }
    }catch {
      if(!actions.isConnected)return;
      status.remove();
      actions.append(link(item.searchQuery,"Look for alternatives ↗"));
      actions.append(node("span","library-meta","Live price unavailable"));
    }
  }
  function renderFavorites(target) {
    if(!dbState.favorites.length) {
      showEmpty(target,"No favorite items yet.","Favorite a suggested piece from any MATCHLATCH outfit to keep it here.");
      return;
    }
    const grid=node("div","library-grid");
    for(const fav of dbState.favorites){
      const {card,body}=makeCard(fav.inspirationId,fav.description,
        fav.type+" · "+(fav.shopRef?"Price when selected ":"Suggested target ")+money(fav.target),
        "Inspired by "+(inspirationFor(fav.inspirationId)?.label||"your original photo"));
      const actions=node("div","library-actions");
      void appendLiveShopLink(actions,fav);
      actions.append(btn("Add to cart",()=>addToCart(fav.lookId,fav.pieceIndex)));
      actions.append(btn("View outfit",()=>openLookDetails(fav.lookId)));
      actions.append(btn("View photo",()=>focusInspiration(fav.inspirationId)));
      actions.append(btn("Remove favorite",()=>toggleFavorite(fav.lookId,fav.pieceIndex),"quiet-button"));
      body.append(actions);grid.append(card);
    }
    target.append(grid);
  }
  function renderPurchases(target) {
    if(!dbState.purchases.length){
      showEmpty(target,"No purchases recorded yet.","After buying an item at a retailer, record it from your cart. We'll keep the original inspiration photo attached.");
      return;
    }
    for(const purchase of dbState.purchases) {
      const entry=node("article","purchase-summary");
      entry.append(imageFrame(purchase.inspirationId,"purchase-photo"));
      const content=node("div");
      content.append(node("div","library-meta","Self-reported purchase · "+dateLabel(purchase.date)));
      content.append(node("h3",null,purchase.description));
      content.append(node("p",null,(purchase.retailer?"Retailer: "+purchase.retailer+" · ":"")+"Amount recorded: "+money(purchase.paid)));
      content.append(node("p",null,"Original inspiration: "+(inspirationFor(purchase.inspirationId)?.label||"Unavailable")));
      if(purchase.notes)content.append(node("p",null,"Notes: "+purchase.notes));
      const actions=node("div","library-actions");
      actions.append(btn("View original photo ↗",()=>focusInspiration(purchase.inspirationId)));
      actions.append(btn("View curated outfit",()=>openLookDetails(purchase.lookId)));
      content.append(actions);entry.append(content);target.append(entry);
    }
  }

  function renderCart() {
    const target=$("cart-body");target.replaceChildren();
    const old=$("purchase-editor");
    if(old)old.remove();
    target.append(node("p","library-caption","Shopping shortlist · Prices are spending targets, not retailer quotes · Checkout happens at the retailer."));
    if(!dbState.cart.length) {
      showEmpty(target,"Your cart is empty.","Add a recommended piece from any outfit to start a shopping shortlist.");
      return;
    }
    const list=node("div","cart-list");
    for(const item of dbState.cart) {
      const row=node("article","cart-entry");
      row.append(imageFrame(item.inspirationId,"cart-thumb"));
      const info=node("div","cart-info");
      info.append(node("div","library-meta",item.type+" · "+(item.shopRef?"Price when selected ":"Budget target ")+money(item.target)));
      info.append(node("h3",null,item.description));
      info.append(node("small",null,"Inspired by: "+(inspirationFor(item.inspirationId)?.label||"original photo")));
      const controls=node("div","cart-controls");
      void appendLiveShopLink(controls,item);
      controls.append(btn("Record purchase",()=>openPurchaseForm(item.id)));
      controls.append(btn("Remove",()=>{
        dbState.cart=dbState.cart.filter(x=>x.id!==item.id);
        persist();renderCart();
        feedback("Removed from cart.","Undo",()=>{
          if(!dbState.cart.some(x=>x.id===item.id))dbState.cart.unshift(item);
          persist();if(activePage==="cart")renderCart();
        });
      },"quiet-button"));
      info.append(controls);row.append(info);list.append(row);
    }
    target.append(list);
    const total=dbState.cart.reduce((sum,x)=>sum+(Number(x.target)||0),0);
    const totals=node("div","cart-total");
    totals.append(node("span",null,"Saved-price estimate · retailer prices can change"),node("strong",null,money(total)));
    target.append(totals);
  }

  function openPurchaseForm(cartId) {
    const cart=dbState.cart.find(x=>x.id===cartId);
    if(!cart)return;
    document.getElementById("purchase-editor")?.remove();
    const panel=node("section","purchase-form");
    panel.id="purchase-editor";
    panel.append(node("h3",null,"Record a purchase"));
    panel.append(node("p",null,"Only use this after you've bought the item elsewhere. This creates a manual record linked to your inspiration photo—not a verified order or MATCHLATCH payment."));
    const form=document.createElement("form");
    const addField=(name,title,type,required,max)=>{
      const label=node("label",null,title);
      const input=document.createElement("input");
      input.name=name;input.type=type;input.required=Boolean(required);
      if(max)input.maxLength=max;
      if(type==="number"){input.min="0";input.step=".01";}
      if(type==="date")input.value=new Date().toLocaleDateString("en-CA");
      label.append(input);
      form.append(label);
      return input;
    };
    const retailer=addField("retailer","Retailer / store","text",true,100);
    const paid=addField("paid","Amount paid (USD)","number",true);
    const purchased=addField("date","Date purchased","date",true);
    const notes=addField("notes","Notes (optional)","text",false,240);
    notes.parentElement.className="wide";
    const actions=node("div","purchase-actions");
    const submit=node("button","library-primary","Save purchase record");
    submit.type="submit";
    actions.append(submit,btn("Cancel",()=>panel.remove(),"library-subtle"));
    form.append(actions);
    form.addEventListener("submit",event=>{
      event.preventDefault();
      if(!retailer.value.trim()||!purchased.value||!Number.isFinite(Number(paid.value))||Number(paid.value)<0)return;
      dbState.purchases.unshift({
        id:uid(),inspirationId:cart.inspirationId,lookId:cart.lookId,
        description:cart.description,retailer:retailer.value.trim().slice(0,100),
        paid:Number(paid.value),date:purchased.value,notes:notes.value.trim().slice(0,240),
        createdAt:new Date().toISOString(),source:"user-entered"
      });
      dbState.cart=dbState.cart.filter(x=>x.id!==cart.id);
      persist();panel.remove();
      selectedTab="purchases";
      selectedLookDetail=null;
      showPage("styles");
      feedback("Purchase recorded and linked to its inspiration.");
    });
    panel.append(form);
    $("screen-cart").querySelector(".library-section").append(panel);
    panel.scrollIntoView({behavior:"smooth",block:"center"});
  }

  function renderAccount() {
    const status=$("account-status"),submit=$("send-login"),form=$("login-form"),
      logout=$("logout-button"),guest=$("account-guest"),importBox=$("account-import"),
      clear=$("clear-library");
    if(activeUser&&supabase&&cloudAdapter){
      status.textContent=cloudAdapter.getStatus();
      form.hidden=true;logout.hidden=false;guest.hidden=true;
      const guestCount=Object.values(guestState()).reduce((sum,a)=>sum+a.length,0)+
        (window.MatchlatchStyleProfile?.getGuest?.()?1:0);
      importBox.hidden=guestCount===0;
      $("import-guest").disabled=!cloudAdapter.isReady();
      clear.textContent="Delete guest data on this device";
    } else if(supabase) {
      status.textContent="Secure sign-in is ready. Use email to save your styles across devices.";
      form.hidden=false;submit.disabled=false;logout.hidden=true;guest.hidden=false;
      importBox.hidden=true;
      clear.textContent="Delete guest library";
    } else {
      status.textContent="Continue as a guest until the secure account connection is configured.";
      form.hidden=true;logout.hidden=true;guest.hidden=false;
      importBox.hidden=true;clear.textContent="Delete guest library";
    }
  }

  $("login-form").addEventListener("submit",async event=>{
    event.preventDefault();
    if(!supabase)return;
    const email=$("login-email").value.trim();
    if(!email)return;
    $("send-login").disabled=true;
    $("account-status").textContent="Requesting a sign-in link…";
    try {
      const {error}=await supabase.auth.signInWithOtp({
        email, options:{emailRedirectTo:location.origin+"/#account"}
      });
      if(error)throw error;
      $("account-status").textContent="Check your email for a secure sign-in link. Return to this browser to complete sign-in.";
    }catch(error){$("account-status").textContent=error.message||"Sign-in link could not be sent.";}
    finally{$("send-login").disabled=false;}
  });
  $("logout-button").addEventListener("click",async()=>{
    if(!supabase)return;
    if(cloudAdapter?.hasPending?.()&&!confirm("Some changes haven't synced yet. Signing out could lose them. Sign out anyway?"))return;
    const button=$("logout-button");button.disabled=true;
    try {
      const {error}=await supabase.auth.signOut();
      if(error)throw error;
      await applyAuth(null);
      feedback("Signed out. Guest library restored.");
    }catch(error){feedback(error?.message||"Couldn't sign out. Try again.");}
    finally{button.disabled=false;}
  });
  $("import-guest").addEventListener("click",async()=>{
    if(!cloudAdapter?.isReady())return;
    const button=$("import-guest");button.disabled=true;
    const result=await cloudAdapter.importGuest();
    feedback(result.message);
    if(activePage==="account")renderAccount();
    button.disabled=false;
  });
  $("clear-library").addEventListener("click",async()=>{
    const guest=guestState();
    if(!Object.values(guest).some(x=>x.length)) {
      feedback("There's no guest library to delete.");return;
    }
    if(!confirm("Delete guest styles and their saved photos from this device? Signed-in cloud data will not be changed."))return;
    await clearGuestPhotos();
    localStorage.removeItem(STORAGE_KEY);
    if(!activeUser)setGuest();
    if(activePage==="account")renderAccount();
    feedback("Guest library deleted.");
  });

  let authSwitch=0;
  let lastAppliedAuthId;
  async function applyAuth(user) {
    const nextId=user?.id||null;
    // Supabase fires SIGNED_IN and TOKEN_REFRESHED for an existing session.
    // Reinitializing on every event can discard queued offline changes.
    if(lastAppliedAuthId===nextId)return;
    lastAppliedAuthId=nextId;
    const priorId=activeUser?.id||null;
    const run=++authSwitch;
    if(nextId!==priorId) {
      window.MatchlatchResetStudio?.();
      currentLookId=null;
      selectedLookDetail=null;
    }
    activeUser=nextId?user:null;
    if(!activeUser) {
      if(cloudAdapter)await cloudAdapter.setUser(null);
      else setGuest();
    } else if(cloudAdapter) {
      await cloudAdapter.setUser(activeUser);
    }
    if(run===authSwitch && activePage==="account")renderAccount();
  }
  async function initAuth() {
    try{
      const response=await fetch("/api/auth-config",{cache:"no-store"});
      if(!response.ok)return;
      const cfg=await response.json();
      if(!cfg.enabled||!cfg.url||!cfg.publishableKey)return;
      const [module,cloudModule]=await Promise.all([
        import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"),
        import("/cloud-sync.js")
      ]);
      supabase=module.createClient(cfg.url,cfg.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
      cloudAdapter=cloudModule.createCloudSync(supabase,{
        setState, setGuest,getGuestState:guestState,
        onStatus:()=>{if(activePage==="account")renderAccount();},
        saveAccountPhoto:writePhoto,loadAccountPhoto:readPhoto,loadGuestPhoto,
        clearAccountPhotos,
        getGuestProfile:()=>window.MatchlatchStyleProfile?.getGuest?.(),
        applyProfile:value=>window.MatchlatchStyleProfile?.apply?.(value)
      });
      window.MatchlatchCloud={
        isSignedIn:()=>Boolean(activeUser&&cloudAdapter),
        updateProfile:value=>cloudAdapter?.queueProfile(value),
        retry:()=>cloudAdapter?.retry()
      };
      const {data,error}=await supabase.auth.getUser();
      if(error)console.warn("Account session check:",error.message);
      await applyAuth(data?.user||null);
      supabase.auth.onAuthStateChange((_event,session)=>{
        setTimeout(()=>void applyAuth(session?.user||null),0);
      });
      if(activePage==="account")renderAccount();
    }catch(error){
      console.warn("MATCHLATCH secure login not initialized:",error?.message||error);
      setGuest();
    }
  }

  function shopPiece(slot,item){
    const look=currentLook();
    if(!look||!item?.productId||!item?.variantId)return -1;
    let index=look.pieces.findIndex(p=>p.shopRef?.variantId===item.variantId);
    if(index>=0)return index;
    index=look.pieces.length;
    look.pieces.push({
      type:slot.charAt(0).toUpperCase()+slot.slice(1),
      description:String(item.title||slot).slice(0,155)+" · "+String(item.merchant||"Retailer").slice(0,65),
      searchQuery:String(item.title||slot).slice(0,165),
      target:Number(item.price)||0,
      priceAtSelection:Number(item.price)||0,
      shopRef:{productId:String(item.productId),variantId:String(item.variantId),slot}
    });
    persist();
    return index;
  }
  function chooseShopItem(slot,item){
    const look=currentLook();
    if(!look||!item?.variantId||!item?.productId)return;
    if(!look.shopSelections)look.shopSelections={};
    look.shopSelections[slot]={
      productId:String(item.productId),variantId:String(item.variantId),
      title:String(item.title||slot).slice(0,155),slot
    };
    persist();
  }
  function favoriteShopItem(slot,item){
    const index=shopPiece(slot,item);
    if(index<0)return;
    if(!favoriteExists(currentLookId,index))toggleFavorite(currentLookId,index);
    else feedback("This item is already in your favorites.");
  }
  function cartShopItem(slot,item){
    const index=shopPiece(slot,item);
    if(index>=0)addToCart(currentLookId,index);
  }
  window.MatchlatchLibrary={captureLook,showPage,renderStyles,renderCart,
    chooseShopItem,favoriteShopItem,cartShopItem};
  void initAuth();
})();