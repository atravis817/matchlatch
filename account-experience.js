/* MATCHLATCH account flow: no card-number collection, no biometric storage. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const questions=[
 ["Your everyday vibe?",["Minimal","Classic","Streetwear","Sporty"]],
 ["Preferred silhouette?",["Relaxed","Tailored","Oversized","Fitted"]],
 ["Color palette?",["Neutrals","Earth tones","Bright","Monochrome"]],
 ["Favorite pattern?",["Solid","Stripes","Plaid","Prints"]],
 ["Ideal layering?",["Light","Structured","Cozy","Statement"]],
 ["Primary occasion?",["Everyday","Work","Going out","Active"]],
 ["Preferred footwear?",["Sneakers","Boots","Loafers","Dress shoes"]],
 ["Shopping priority?",["Fit","Quality","Value","Uniqueness"]],
 ["Accessories?",["Minimal","Practical","Bold","Layered"]],
 ["Fabric feel?",["Cotton","Linen","Denim","Technical"]],
 ["Denim cut?",["Straight","Wide","Slim","Relaxed"]],
 ["Preferred top?",["T-shirt","Button-down","Knit","Hoodie"]],
 ["Jacket style?",["Blazer","Bomber","Overshirt","Coat"]],
 ["How often try trends?",["Rarely","Sometimes","Often","Always"]],
 ["Style inspiration?",["Modern","Vintage","Outdoor","Luxury"]],
 ["Preferred contrast?",["Low","Medium","High","Color-blocked"]],
 ["Favorite season to dress?",["Spring","Summer","Fall","Winter"]],
 ["Outfit complexity?",["Simple","Balanced","Layered","Expressive"]],
 ["Brand preference?",["Flexible","Independent","Established","Designer"]],
 ["What should AI optimize?",["Comfort","Versatility","Occasion","Personal expression"]]
];
const field=(name,label,type="text",required=false)=>{
 const wrap=document.createElement("label");wrap.className="ml-account-field";
 const text=document.createElement("span");text.textContent=label;
 const input=document.createElement("input");input.name=name;input.type=type;input.required=required;
 input.autocomplete=({email:"email",password:"new-password",first:"given-name",last:"family-name",phone:"tel",ship1:"shipping address-line1",ship2:"shipping address-line2",shipCity:"shipping address-level2",shipState:"shipping address-level1",shipZip:"shipping postal-code",bill1:"billing address-line1",billCity:"billing address-level2",billState:"billing address-level1",billZip:"billing postal-code"})[name]||"off";
 wrap.append(text,input);return wrap;
};
const section=(title)=>{const el=document.createElement("h3");el.textContent=title;return el;};
const btn=(label,type="button")=>{const b=document.createElement("button");b.type=type;b.textContent=label;return b;};
function launch(){
 if($("ml-account-screen"))return;
 const shell=document.createElement("section");shell.id="ml-account-screen";shell.className="ml-account-screen";shell.hidden=true;
 shell.setAttribute("role","dialog");shell.setAttribute("aria-modal","true");shell.setAttribute("aria-label","MATCHLATCH login and signup");
 const box=document.createElement("div");box.className="ml-account-box";
 const close=btn("✕ Close");close.className="ml-account-close";close.onclick=()=>show(false);
 const h=document.createElement("h2");h.textContent="Your MATCHLATCH";h.id="ml-account-title";
 const greeting=document.createElement("p");greeting.id="ml-account-greeting";greeting.textContent="Welcome back. Your style starts here.";
 const status=document.createElement("p");status.id="ml-account-status";status.setAttribute("role","status");
 const form=document.createElement("form");form.id="ml-account-form";
 const extra=document.createElement("div");extra.id="ml-account-extra";
 const switchMode=btn("Sign up");switchMode.className="ml-account-switch";
 const quizWrap=document.createElement("section");quizWrap.id="ml-account-quiz";quizWrap.hidden=true;
 const quizButton=btn("Take optional 20-question style quiz");quizButton.className="ml-account-quiz-button";
 let mode="login",pendingEmail="",pendingAnswers={},pendingAddresses=null;
 const client=()=>window.MatchlatchAuth?.client;
 const authPasskey=()=>client()?.auth?.signInWithPasskey;
 function setStatus(message){status.textContent=message;}
 function drawForm(){
  form.replaceChildren();extra.replaceChildren();quizWrap.hidden=true;
  if(mode==="login"){
   h.textContent="Welcome back";
   form.append(field("email","Email","email",true),field("password","Password","password",true));
   const go=btn("Log in","submit");go.className="ml-account-primary";form.append(go);
   extra.append(switchMode);switchMode.textContent="Sign up";
   const passkey=btn("Sign in with Face ID / passkey");passkey.className="ml-account-secondary";
   passkey.onclick=async()=>{const auth=client();if(!auth){setStatus("Account service unavailable.");return;}
    try{const {error}=await auth.auth.signInWithPasskey();if(error)throw error;setStatus("Signed in securely.");}
    catch(e){setStatus(e.message||"Passkey sign-in is not yet available on this device.");}};
   // Passkey API is experimental and needs explicit provider configuration before display.
   passkey.hidden=!(window.MatchlatchAuth?.passkeysEnabled&&typeof authPasskey()==="function");extra.append(passkey);
  }else if(mode==="signup"){
   h.textContent="Create your account";
   form.append(section("Your details"),field("first","First name","text",true),field("last","Last name"),field("email","Email","email",true),field("password","Create password","password",true),field("phone","Phone (optional)","tel"));
   form.append(section("Shipping address · optional"),field("ship1","Street address"),field("ship2","Apartment / suite"),field("shipCity","City"),field("shipState","State"),field("shipZip","ZIP code"));
   form.append(section("Billing address · optional"),field("bill1","Street address"),field("billCity","City"),field("billState","State"),field("billZip","ZIP code"));
   const card=document.createElement("p");card.className="ml-account-hint";card.textContent="Payment details are optional and will be added later through a secure payment provider. MATCHLATCH does not collect card numbers. Apple Pay will appear when supported by checkout.";
   form.append(card,quizButton,quizWrap);
   const go=btn("Create account & email verification code","submit");go.className="ml-account-primary";form.append(go);
   extra.append(switchMode);switchMode.textContent="Already have an account? Log in";
  }else if(mode==="verify"){
   h.textContent="Verify your email";
   const notice=document.createElement("p");notice.textContent="Enter the one-time code sent to "+pendingEmail+".";
   form.append(notice,field("otp","Email verification code","text",true));
   const go=btn("Verify email","submit");go.className="ml-account-primary";form.append(go);
   extra.append(switchMode);switchMode.textContent="Back to login";
  }else{
   h.textContent="Your account";
   const signout=btn("Sign out");signout.className="ml-account-secondary";
   signout.onclick=async()=>{const {error}=await client()?.auth.signOut();if(error)setStatus(error.message);else {mode="login";drawForm();setStatus("Signed out.");}};
   form.append(signout);
   const passkey=btn("Enable Face ID / passkey");passkey.className="ml-account-secondary";
   passkey.hidden=!window.MatchlatchAuth?.passkeysEnabled;passkey.onclick=async()=>{try{const {error}=await client().auth.registerPasskey();if(error)throw error;setStatus("Passkey registered.");}catch(e){setStatus(e.message||"Passkey registration unavailable.");}};
   form.append(passkey);
   extra.append(switchMode);switchMode.textContent="Return to account";
  }
 }
 quizButton.onclick=()=>{quizWrap.hidden=!quizWrap.hidden;if(quizWrap.hidden)return;quizWrap.replaceChildren();
  questions.forEach(([prompt,opts],i)=>{const label=document.createElement("label");label.className="ml-quiz-question";const strong=document.createElement("strong");strong.textContent=(i+1)+". "+prompt;const select=document.createElement("select");select.name="quiz-"+i;select.append(new Option("Skip this question",""));opts.forEach(x=>select.append(new Option(x,x)));select.value=pendingAnswers[i]||"";select.onchange=()=>{pendingAnswers[i]=select.value;};label.append(strong,select);quizWrap.append(label);});
 };
 switchMode.onclick=()=>{mode=mode==="login"?"signup":"login";drawForm();setStatus("");};
 form.onsubmit=async event=>{
  event.preventDefault();const auth=client();if(!auth){setStatus("Secure sign-in is unavailable. Please retry.");return;}
  const data=Object.fromEntries(new FormData(form));const submit=form.querySelector('[type="submit"]');submit.disabled=true;
  try{
   if(mode==="login"){
    const {error}=await auth.auth.signInWithPassword({email:data.email.trim(),password:data.password});if(error)throw error;
    mode="account";drawForm();setStatus("Signed in.");
   }else if(mode==="signup"){
    if(data.password.length<8)throw Error("Use a password of at least eight characters.");
    const email=data.email.trim();pendingEmail=email;
    pendingAddresses={shipping:{line1:data.ship1||"",line2:data.ship2||"",city:data.shipCity||"",state:data.shipState||"",zip:data.shipZip||""},billing:{line1:data.bill1||"",city:data.billCity||"",state:data.billState||"",zip:data.billZip||""}};
    const {error}=await auth.auth.signUp({email,password:data.password,options:{data:{first_name:data.first.trim().slice(0,80),last_name:data.last.trim().slice(0,80),phone:data.phone.trim().slice(0,32)}}});
    if(error)throw error;
    // Never persist addresses locally or through editable auth metadata.
    // Private address profile table + RLS is a separate required provisioning step.
    mode="verify";drawForm();
    setStatus("Check your inbox for the one-time verification code. Addresses will be saved after verification when the secure profile table is provisioned.");
   }else if(mode==="verify"){
    const {error}=await auth.auth.verifyOtp({email:pendingEmail,token:data.otp.trim(),type:"email"});if(error)throw error;
    const answered=Object.entries(pendingAnswers).filter(([,v])=>v);
    const {data:accountData}=await auth.auth.getUser();
    if(accountData?.user?.id&&pendingAddresses){
      const {error:profileError}=await auth.from("matchlatch_private_profiles").upsert({user_id:accountData.user.id,shipping_address:pendingAddresses.shipping,billing_address:pendingAddresses.billing},{onConflict:"user_id"});
      if(profileError)setStatus("Email verified. Secure address saving is not configured yet; please add addresses later.");
      pendingAddresses=null;
    }
    if(answered.length){const styleQuiz={version:1,answers:Object.fromEntries(answered),completedAt:new Date().toISOString()};
      try{const old=JSON.parse(localStorage.getItem("matchlatch-style-quiz-v1")||"null");
        localStorage.setItem("matchlatch-style-quiz-v1",JSON.stringify(styleQuiz));
        window.dispatchEvent(new CustomEvent("matchlatch:style-quiz",{detail:styleQuiz}));
      }catch{}}
    mode="account";drawForm();if(!status.textContent.includes("not configured"))setStatus("Email verified. Welcome to MATCHLATCH!");
   }
  }catch(e){setStatus(e.message||"Authentication could not be completed.");}
  finally{if(submit.isConnected)submit.disabled=false;}
 };
 box.append(close,h,greeting,status,form,extra);shell.append(box);document.body.append(shell);drawForm();
 const updateGreeting=user=>{const first=String(user?.user_metadata?.first_name||"").trim().slice(0,60);
  const header=$("matchlatch-login-entry");if(header)header.textContent=first?first:user?"My account":"Log in";
  const splash=document.querySelector("#screen-studio h1,#screen-mood h1");
  if(user&&first){greeting.textContent="Great to see you, "+first+"!";
    let hello=$("ml-personal-greeting");if(!hello){hello=document.createElement("p");hello.id="ml-personal-greeting";hello.className="ml-personal-greeting";const target=document.querySelector("#screen-studio .container,#screen-mood .container");if(target)target.prepend(hello);}
    if(hello)hello.textContent=(new Date().getHours()<12?"Good morning":new Date().getHours()<17?"Good afternoon":"Good evening")+", "+first+"!";
  }else{greeting.textContent="Welcome back. Your style starts here.";$("ml-personal-greeting")?.remove();}
 };
 window.addEventListener("matchlatch:auth-user",event=>updateGreeting(event.detail?.user));
 window.addEventListener("matchlatch:auth-ready",()=>{drawForm();void client()?.auth.getUser().then(({data})=>{updateGreeting(data?.user);if(data?.user){mode="account";drawForm();}});});
 if(client())void client().auth.getUser().then(({data})=>{updateGreeting(data?.user);if(data?.user){mode="account";drawForm();}});
 shell.addEventListener("keydown",event=>{if(event.key==="Escape")show(false);});
 return {show,modeTo(next){mode=next;drawForm();show(true);}};
 function show(open){shell.hidden=!open;if(open){setStatus("");close.focus();}else $("matchlatch-login-entry")?.focus();}
}
let ui;
function init(){ui=launch();$("matchlatch-login-entry")?.addEventListener("click",()=>ui.show(true));}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})();
