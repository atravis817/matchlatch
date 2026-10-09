// MATCHLATCH POC-02: deterministic delivery intelligence.
// Never infer shipping from a retailer name, ZIP alone, or search citations.
const DAY=86400000;
const validDay=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const validZip=s=>typeof s==="string"&&/^\d{5}$/.test(s);
function plusBusinessDays(day,days){
 let date=new Date(day+"T12:00:00Z"),added=0;
 while(added<days){date=new Date(date.getTime()+DAY);if(date.getUTCDay()!==0&&date.getUTCDay()!==6)added++;}
 return date.toISOString().slice(0,10);
}
export function evaluateDelivery(item,{zip="",needBy="",today=""}={}){
 const unknown=(reason)=>({tier:"unknown",eligible:false,earliest:null,latest:null,reason});
 if(!validZip(zip))return unknown("Set a destination ZIP in Me.");
 if(needBy&&(!validDay(needBy)||!validDay(today)||needBy<today))return unknown("Choose a valid future deadline.");
 const estimate=item?.deliveryEstimate;
 if(estimate?.source==="retailer"&&estimate.destinationZip===zip
   &&validDay(estimate.earliest)&&validDay(estimate.latest)
   &&estimate.earliest<=estimate.latest
   &&validDay(estimate.checkedAt?.slice(0,10))
   &&estimate.checkedAt.slice(0,10)===today){
  return {tier:"retailer_confirmed",eligible:!needBy||estimate.latest<=needBy,
   earliest:estimate.earliest,latest:estimate.latest,reason:"Retailer-reported destination estimate; subject to logistics."};
 }
 // Policy forecasts require explicit retailer-originated shipping evidence,
 // destination scope, an as-of date, and an observed service cutoff.
 // They are informational, not strict "arrives by" passes.
 const policy=item?.shippingPolicy;
 if(policy?.source!=="retailer_policy"||!policy.sourceUrl?.startsWith("https://")
  ||policy.destinationZip!==zip||!validDay(today)
  ||policy.checkedDate!==today||policy.cutoffVerified!==true
  ||policy.beforeCutoff!==true
  ||policy.calendar!=="business_days"
  ||![policy.handlingMin,policy.handlingMax,policy.transitMin,policy.transitMax].every(n=>Number.isInteger(n)&&n>=0&&n<=30)
  ||policy.handlingMin>policy.handlingMax||policy.transitMin>policy.transitMax){
  return unknown("No current retailer destination forecast or usable shipping policy.");
 }
 const earliest=plusBusinessDays(today,policy.handlingMin+policy.transitMin);
 const latest=plusBusinessDays(today,policy.handlingMax+policy.transitMax);
 return {tier:"policy_forecast",eligible:false,earliest,latest,
  reason:"Policy-based forecast only; not retailer-confirmed for this order."};
}
