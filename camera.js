/* MATCHLATCH Studio camera — camera access only after an explicit tap.
 * Uses the browser's native permission request; never emulates an OS prompt.
 * Captures a local JPEG and passes it through the existing Studio photo pipeline.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const dialog=$("studio-camera-dialog");
if(!dialog)return;
const openButton=$("open-camera"),closeButton=$("camera-close");
const video=$("camera-video"),review=$("camera-review"),status=$("camera-status");
const shutter=$("camera-shutter"),flip=$("camera-flip");
const retake=$("camera-retake"),use=$("camera-use");
const choosePhoto=$("camera-choose-photo");
const photoInput=$("photo"),fallback=$("camera-fallback");
let stream=null,reviewBlob=null,reviewUrl="",facing="environment",sequence=0,lastFocus=null,working=false;

function stopStream(){
  if(stream){
    for(const track of stream.getTracks())track.stop();
    stream=null;
  }
  try{video.pause();}catch{}
  video.srcObject=null;
}
function discardReview(){
  reviewBlob=null;
  review.hidden=true;
  review.removeAttribute("src");
  if(reviewUrl)URL.revokeObjectURL(reviewUrl);
  reviewUrl="";
}
function setLiveState(){
  review.hidden=true;
  video.hidden=false;
  shutter.hidden=false;
  shutter.disabled=true;
  flip.hidden=false;
  flip.disabled=true;
  retake.hidden=true;
  use.hidden=true;
  use.disabled=false;
  working=false;
}
function closeCamera(){
  sequence++; // Invalidate any still-pending native permission request.
  stopStream();
  discardReview();
  if(dialog.open)dialog.close();
}
function cameraError(error){
  if(["NotAllowedError","PermissionDeniedError","SecurityError"].includes(error?.name))
    return "Camera access wasn't allowed. Enable Camera for this website in browser settings, or choose a photo instead.";
  if(["NotFoundError","DevicesNotFoundError"].includes(error?.name))
    return "No camera was found. Choose a photo from your device instead.";
  if(["NotReadableError","TrackStartError"].includes(error?.name))
    return "The camera is being used by another app. Close that app, then try again.";
  if(["OverconstrainedError","ConstraintNotSatisfiedError"].includes(error?.name))
    return "This camera setting isn't supported. Try switching cameras or choosing a photo.";
  return "The camera couldn't start. You can close it and try again, or choose a photo.";
}
async function startCamera(){
  if(!dialog.open)return;
  const attempt=++sequence;
  stopStream();
  discardReview();
  setLiveState();
  status.textContent="Requesting camera access…";
  try{
    const acquired=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{
        facingMode:{ideal:facing},
        width:{ideal:1280},
        height:{ideal:1920}
      }
    });
    if(attempt!==sequence||!dialog.open){
      acquired.getTracks().forEach(track=>track.stop());
      return;
    }
    stream=acquired;
    video.srcObject=stream;
    video.style.transform=facing==="user"?"scaleX(-1)":"none";
    try{await video.play();}
    catch(error){throw error;}
    if(attempt!==sequence||!dialog.open){
      stopStream();
      return;
    }
    if(!video.videoWidth||!video.videoHeight)throw new Error("Video frame unavailable");
    shutter.disabled=false;
    flip.disabled=false;
    status.textContent="Ready. Tap the shutter to capture your look.";
  }catch(error){
    if(attempt!==sequence||!dialog.open)return;
    stopStream();
    shutter.disabled=true;
    flip.disabled=false;
    status.textContent=cameraError(error);
  }
}
async function openCamera(){
  // No media permission request occurs on app startup or page navigation.
  // Older webviews use the operating system's camera file picker instead.
  if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||typeof dialog.showModal!=="function"){
    fallback.value="";
    fallback.click();
    return;
  }
  if(dialog.open)return;
  facing="environment";
  lastFocus=document.activeElement;
  dialog.showModal();
  closeButton.focus({preventScroll:true});
  await startCamera();
}
async function takePhoto(){
  if(working||!stream||shutter.disabled||video.readyState<2)return;
  const width=video.videoWidth,height=video.videoHeight;
  if(!width||!height){
    status.textContent="Camera isn't ready. Try again.";
    return;
  }
  working=true;
  shutter.disabled=true;
  flip.disabled=true;
  status.textContent="Capturing photo…";
  const attempt=sequence;
  try{
    const canvas=document.createElement("canvas");
    const scale=Math.min(1,1600/Math.max(width,height));
    canvas.width=Math.max(1,Math.round(width*scale));
    canvas.height=Math.max(1,Math.round(height*scale));
    const ctx=canvas.getContext("2d");
    if(!ctx)throw new Error("Canvas unavailable");
    if(facing==="user"){
      ctx.translate(canvas.width,0);
      ctx.scale(-1,1);
    }
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",.84));
    if(attempt!==sequence||!dialog.open)return;
    if(!blob||!blob.size)throw new Error("Unable to capture frame");
    reviewBlob=blob;
    reviewUrl=URL.createObjectURL(blob);
    review.src=reviewUrl;
    review.hidden=false;
    video.hidden=true;
    stopStream(); // Camera turns off as soon as the frame is captured.
    shutter.hidden=true;
    flip.hidden=true;
    retake.hidden=false;
    use.hidden=false;
    status.textContent="How does it look?";
    use.focus({preventScroll:true});
  }catch{
    if(attempt!==sequence||!dialog.open)return;
    status.textContent="Couldn't capture that frame. Try again.";
    shutter.disabled=false;
    flip.disabled=false;
  }finally{working=false;}
}
async function usePhoto(){
  if(!reviewBlob||working)return;
  const blob=reviewBlob;
  working=true;
  use.disabled=true;
  status.textContent="Adding photo to Studio…";
  try{
    const photo=new File([blob],"matchlatch-photo-"+Date.now()+".jpg",{type:"image/jpeg",lastModified:Date.now()});
    const accepted=await window.MatchlatchStudioPhoto?.loadFile?.(photo);
    if(accepted){
      closeCamera();
    }else{
      status.textContent="Couldn't add this photo. Try retaking it.";
      use.disabled=false;
    }
  }catch{
    status.textContent="Couldn't add this photo. Try retaking it.";
    use.disabled=false;
  }finally{working=false;}
}
openButton.addEventListener("click",()=>void openCamera());
closeButton.addEventListener("click",closeCamera);
shutter.addEventListener("click",()=>void takePhoto());
flip.addEventListener("click",()=>{
  if(!dialog.open||working)return;
  facing=facing==="environment"?"user":"environment";
  void startCamera();
});
retake.addEventListener("click",()=>void startCamera());
use.addEventListener("click",()=>void usePhoto());
choosePhoto.addEventListener("click",()=>{
  closeCamera();
  photoInput.value="";
  photoInput.click();
});
dialog.addEventListener("close",()=>{
  sequence++;
  stopStream();
  discardReview();
  setLiveState();
  status.textContent="";
  const captured=$("retake-camera");
  const focusTarget=captured&&!captured.hidden?captured:lastFocus;
  if(focusTarget?.isConnected)focusTarget.focus({preventScroll:true});
  lastFocus=null;
});
// Camera never keeps running offscreen or after the user leaves Studio.
document.addEventListener("visibilitychange",()=>{if(document.hidden)closeCamera();});
window.addEventListener("pagehide",closeCamera);
window.addEventListener("matchlatch:page",event=>{
  if(event.detail?.page!=="studio")closeCamera();
});
window.MatchlatchCamera=Object.freeze({close:closeCamera});
})();