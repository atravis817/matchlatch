import sourceModel from '../checkout-model.js';
import {groundedLook} from './styling-engine.mjs';

// Called only with freshly retrieved server candidates, never client products.
// This checks existing permission/identity; it does not grant retention rights.
export function validateSaveSelection(ids,candidates,intent,{maxItems=6}={}){
 if(!Array.isArray(ids)||!ids.length||ids.length>maxItems||new Set(ids).size!==ids.length||ids.some(id=>!candidates.some(p=>p.id===id)))return {error:'Selected products must still meet your catalog constraints.'};
 const selected=ids.map(id=>candidates.find(p=>p.id===id));
 const look=groundedLook(selected,intent,ids);
 if(look.products.length!==selected.length)return {error:'The selected look no longer meets your total budget.'};
 if(!look.products.length)return {error:'There are no verified products to save.'};
 if(look.products.some(p=>!p.owned&&!sourceModel.canSave(p)))return {error:'Source save permission or identity is unresolved.'};
 return {look};
}
