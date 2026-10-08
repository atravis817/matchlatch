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
  const empty = () => ({inspirations:[],looks:[],favorites:[],cart:[],purchases:[]});
  let dbState = empty();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (raw && typeof raw === "object") {
      for (const key of Object.keys(dbState)) if (Array.isArray(raw[key])) dbState[key] = raw[key];
    }
  } catch {}
  let activePage="studio";
  let activeTab="inspirations";
  let currentLookId=null;
  let selectedInspiration=null;
  let supabase=null;
  let activeUser=null;
  const photoCache = new Map();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY,JSON.stringify(dbState));
      refreshCounts();
      return true;
    } catch (error) {
      console.warn("MATCHLATCH could not save local library",error);
      window.alert("Your browser storage is full or blocked. The latest changes may not survive a refresh.");
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
  async function savePhoto(id,data) {
    if(!id||!data)return;
    photoCache.set(id,data);
    const db=await databasePromise;
    if(!db)return;
    return new Promise(resolve=>{
      try {
        const tx=db.transaction("photos","readwrite");
        tx.objectStore("photos").put(data,id);
        tx.oncomplete=()=>resolve(true);
        tx.onerror=()=>resolve(false);
      }catch{resolve(false);}
    });
  }
  async function loadPhoto(id) {
    if(!id)return null;
    if(photoCache.has(id))return photoCache.get(id);
    const db=await databasePromise;
    if(!db)return null;
    return new Promise(resolve=>{
      try {
        const req=db.transaction("photos","readonly").objectStore("photos").get(id);
        req.onsuccess=()=>{
          const data=typeof req.result==="string"?req.result:null;
          if(data)photoCache.set(id,data);
          resolve(data);
        };
        req.onerror=()=>resolve(null);
      }catch{resolve(null);}
    });
  }
  async function clearPhotos() {
    photoCache.clear();
    const db=await databasePromise;
    if(!db)return;
    try {db.transaction("photos","readwrite").objectStore("photos").clear();}catch{}
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
        fallback.textContent="Photo not available on this device";
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
    if(updateHash)history.replaceState(null,"","#"+(page==="studio"?"studio":page));
    if(page==="styles")renderStyles();
    if(page==="cart")renderCart();
    if(page==="account")renderAccount();
    window.scrollTo({top:0,behavior:"instant"});
  }
  function readLocation() {
    const hash=(location.hash||"").replace("#","").split("?")[0].toLowerCase();
    if(["styles","cart","account"].includes(hash))return hash;
    return "studio";
  }
  document.querySelectorAll(".app-nav button").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
  document.querySelectorAll("[data-nav-page]").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.navPage)));
  window.addEventListener("hashchange",()=>showPage(readLocation(),false));
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
      const look=lookFor(lookId);
      const piece=look?.pieces[index];
      if(!piece)return;
      dbState.favorites.unshift({
        id:uid(),inspirationId:look.inspirationId,lookId,pieceIndex:index,
        ...piece,createdAt:new Date().toISOString()
      });
    }
    persist();
    if(activePage==="styles")renderStyles();
    if(activePage==="studio")decorateResult(currentLook());
  }
  function addToCart(lookId,index) {
    const look=lookFor(lookId);
    const piece=look?.pieces[index];
    if(!piece)return;
    if(!cartExists(lookId,index)) {
      dbState.cart.unshift({
        id:uid(),inspirationId:look.inspirationId,lookId,pieceIndex:index,...piece,createdAt:new Date().toISOString()
      });
      persist();
    }
    if(activePage==="studio")decorateResult(currentLook());
    if(activePage==="cart")renderCart();
  }
  function toggleSaveLook(lookId) {
    const look=lookFor(lookId);
    if(!look)return;
    look.saved=!look.saved;
    persist();
    if(activePage==="studio")decorateResult(currentLook());
    if(activePage==="styles")renderStyles();
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

  let selectedTab="inspirations";
  function renderStyles() {
    const nav=$("styles-tabs");
    const content=$("styles-body");
    nav.replaceChildren();
    content.replaceChildren();
    const tabs=[
      ["inspirations","Inspirations",dbState.inspirations.length],
      ["outfits","Saved outfits",dbState.looks.filter(x=>x.saved).length],
      ["favorites","Favorite items",dbState.favorites.length],
      ["purchases","Purchases",dbState.purchases.length]
    ];
    for(const [key,label,count] of tabs){
      const b=btn(label+" ("+count+")",()=>{selectedTab=key;renderStyles();},"");
      b.className=selectedTab===key?"active":"";
      b.setAttribute("role","tab");
      b.setAttribute("aria-selected",String(selectedTab===key));
      nav.append(b);
    }
    nav.setAttribute("role","tablist");
    const note=node("div","library-note");
    note.textContent="Your Styles is saved on this device for now. Purchase records are entered by you and linked to the original inspiration photo; MATCHLATCH does not yet receive verified retailer orders.";
    content.append(note);
    if(selectedTab==="inspirations")renderInspirations(content);
    if(selectedTab==="outfits")renderOutfits(content);
    if(selectedTab==="favorites")renderFavorites(content);
    if(selectedTab==="purchases")renderPurchases(content);
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
        selectedTab="outfits";renderStyles();
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
        look.pieces.map(x=>x.description).join(" · "));
      const actions=node("div","library-actions");
      actions.append(btn("View inspiration ↗",()=>focusInspiration(look.inspirationId)));
      actions.append(btn("Remove saved outfit",()=>toggleSaveLook(look.id),"quiet-button"));
      body.append(actions);
      grid.append(card);
    }
    target.append(grid);
  }
  function renderFavorites(target) {
    if(!dbState.favorites.length) {
      showEmpty(target,"No favorite items yet.","Favorite a suggested piece from any MATCHLATCH outfit to keep it here.");
      return;
    }
    const grid=node("div","library-grid");
    for(const fav of dbState.favorites){
      const {card,body}=makeCard(fav.inspirationId,fav.description,
        fav.type+" · Suggested target "+money(fav.target),
        "Inspired by "+(inspirationFor(fav.inspirationId)?.label||"your original photo"));
      const actions=node("div","library-actions");
      actions.append(link(fav.searchQuery));
      actions.append(btn("Add to cart",()=>addToCart(fav.lookId,fav.pieceIndex)));
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
      content.append(actions);entry.append(content);target.append(entry);
    }
  }

  function renderCart() {
    const target=$("cart-body");target.replaceChildren();
    const old=$("purchase-editor");
    if(old)old.remove();
    const note=node("div","library-note");
    note.textContent="This is your shopping shortlist—not a live checkout. Prices shown are suggested spending targets, not retailer quotes. Shop on the retailer's site, then optionally record what you purchased.";
    target.append(note);
    if(!dbState.cart.length) {
      showEmpty(target,"Your cart is empty.","Add a recommended piece from any outfit to start a shopping shortlist.");
      return;
    }
    const list=node("div","cart-list");
    for(const item of dbState.cart) {
      const row=node("article","cart-entry");
      row.append(imageFrame(item.inspirationId,"cart-thumb"));
      const info=node("div","cart-info");
      info.append(node("div","library-meta",item.type+" · Target "+money(item.target)));
      info.append(node("h3",null,item.description));
      info.append(node("small",null,"Inspired by: "+(inspirationFor(item.inspirationId)?.label||"original photo")));
      const controls=node("div","cart-controls");
      controls.append(link(item.searchQuery,"Search retailers ↗"));
      controls.append(btn("Record purchase",()=>openPurchaseForm(item.id)));
      controls.append(btn("Remove",()=>{
        dbState.cart=dbState.cart.filter(x=>x.id!==item.id);
        persist();renderCart();
      },"quiet-button"));
      info.append(controls);row.append(info);list.append(row);
    }
    target.append(list);
    const total=dbState.cart.reduce((sum,x)=>sum+(Number(x.target)||0),0);
    const totals=node("div","cart-total");
    totals.append(node("span",null,"Combined spending targets (not checkout prices)"),node("strong",null,money(total)));
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
      showPage("styles");
    });
    panel.append(form);
    $("screen-cart").querySelector(".library-section").append(panel);
    panel.scrollIntoView({behavior:"smooth",block:"center"});
  }

  function renderAccount() {
    const status=$("account-status");
    const btnEmail=$("send-login");
    if(activeUser&&supabase) {
      status.textContent="Signed in as "+activeUser.email+". Your styles, cart and photos are still saved on this device; cloud sync is not connected yet.";
      btnEmail.hidden=true;
      $("logout-button").hidden=false;
    } else if(supabase){
      status.textContent="Email sign-in is available. Saved looks and purchases are still local to this browser until cloud storage is connected.";
      btnEmail.hidden=false;
      btnEmail.disabled=false;
      $("logout-button").hidden=true;
    } else {
      status.textContent="Email sign-in needs a Supabase project connection. You can use the full local guest library today—no password or account required.";
      btnEmail.hidden=false;
      btnEmail.disabled=true;
      $("logout-button").hidden=true;
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
    if(supabase)await supabase.auth.signOut();
    activeUser=null;renderAccount();
  });
  $("clear-library").addEventListener("click",async()=>{
    if(!confirm("Delete all saved MATCHLATCH inspirations, photos, outfits, favorites, cart items, and manually recorded purchases from this device? This cannot be undone."))return;
    if(!confirm("Confirm permanent deletion of the MATCHLATCH library on this device."))return;
    dbState=empty();currentLookId=null;persist();await clearPhotos();
    renderStyles();renderCart();
    window.alert("Local MATCHLATCH library cleared.");
  });

  async function initAuth() {
    try {
      const response=await fetch("/api/auth-config",{cache:"no-store"});
      if(!response.ok)return;
      const cfg=await response.json();
      if(!cfg.enabled||!cfg.url||!cfg.publishableKey)return;
      const module=await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm");
      supabase=module.createClient(cfg.url,cfg.publishableKey,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
      const {data}=await supabase.auth.getUser();
      activeUser=data?.user||null;
      supabase.auth.onAuthStateChange((_event,session)=>{
        activeUser=session?.user||null;
        if(activePage==="account")renderAccount();
      });
      if(activePage==="account")renderAccount();
    }catch(error) {
      console.warn("MATCHLATCH account provider not initialized:",error?.message||error);
    }
  }

  window.MatchlatchLibrary={captureLook,showPage,renderStyles,renderCart};
  void initAuth();
})();