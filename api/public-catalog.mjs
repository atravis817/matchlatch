import {RETAILERS,REVIEW_QUEUE} from "../lib/public-retailer-research.mjs";
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
// POC-01 reports policy evaluation only: it does not crawl, scrape, or import.
export async function GET(){
 return json({version:"POC-01",mode:"research_only",enabled:true,
  automatedProductIngestion:false,publishedProductCount:0,
  pricingVerified:false,stockVerified:false,deliveryVerified:false,
  retailers:RETAILERS.map(({id,name,status,reason})=>({id,name,status,reason})),
  reviewQueue:REVIEW_QUEUE.map(({id,name,domain,status})=>({id,name,domain,status})),
  commercialReuseApproved:false,
  nextGate:"Obtain clear permitted commercial data reuse and source-specific delivery evidence before product publication."});
}
