// POC-03: public request bodies are not authenticated retailer evidence.
// Delivery qualification takes place within /api/shop after trusted provider retrieval.
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function POST(){
 return json({error:"DELIVERY_EVIDENCE_NOT_ACCEPTED",message:"Untrusted product evidence cannot establish retailer-confirmed delivery. Use /api/shop with postal and needBy parameters."},403);
}
export async function GET(){
 return json({mode:"server_authoritative",source:"/api/shop",publicEvidenceSubmission:false,
  note:"Shipping estimates are accepted only from server-side retailer adapters."});
}
