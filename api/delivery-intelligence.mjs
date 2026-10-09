import {evaluateDelivery} from "../lib/delivery-intelligence.mjs";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export async function POST(request){
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return json({error:"Cross-origin request denied."},403);
 let body;
 try{const raw=await request.text();if(raw.length>18000)return json({error:"Request too large."},413);body=JSON.parse(raw);}
 catch{return json({error:"Invalid JSON."},400);}
 const zip=String(body?.zip||""),needBy=String(body?.needBy||""),today=String(body?.today||"");
 if(!/^\d{5}$/.test(zip)||!/^(?:|\d{4}-\d{2}-\d{2})$/.test(needBy)||!/^\d{4}-\d{2}-\d{2}$/.test(today))
  return json({error:"Invalid delivery criteria."},400);
 const items=Array.isArray(body?.items)?body.items:[];
 if(items.length>36)return json({error:"Too many product candidates."},400);
 // The endpoint evaluates supplied evidence; never claims that callers' input
 // is authenticated retailer data. A caller cannot create a verified offer here.
 return json({mode:"evidence_evaluation_only",verifiedProductInventory:false,
  results:items.map((item,i)=>({index:i,...evaluateDelivery(item,{zip,needBy,today})})),
  note:"Estimates depend on supplied evidence. Final delivery is determined by the merchant."});
}
