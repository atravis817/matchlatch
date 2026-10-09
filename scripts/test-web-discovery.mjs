// node scripts/test-web-discovery.mjs — deterministic source/citation contract.
import assert from "node:assert/strict";
import {POST} from "../api/discover.mjs";
const previous={
 api:process.env.OPENAI_API_KEY,code:process.env.MATCHLATCH_BETA_CODE,
 model:process.env.OPENAI_WEB_MODEL,fetch:globalThis.fetch
};
try{
 process.env.OPENAI_API_KEY="unit_mock_server_only";
 process.env.MATCHLATCH_BETA_CODE="TEST_BETA_CODE_123456";
 process.env.OPENAI_WEB_MODEL="gpt-5.4";
 let upstream=null,requests=0;
 const productURL="https://www.caciopepebrand.com/products/organic-cotton-camisa-crew-black";
 globalThis.fetch=async(url,init)=>{
  requests++;upstream=JSON.parse(init.body);
  assert.equal(url,"https://api.openai.com/v1/responses");
  return {ok:true,json:async()=>({
   output:[
    {type:"web_search_call",action:{type:"search",sources:[
      {url:productURL,title:"Camisa Crew black"},
      {url:productURL,title:"Duplicate result"},
      {url:"http://insecure.example/product",title:"Insecure reference"},
      {url:"https://example.com/article/fashion",title:"Styling overview"}
    ]}},
    {type:"message",content:[{type:"output_text",
      text:"Look for slim organic cotton crew necks in black.",
      annotations:[{type:"url_citation",url:productURL,title:"Organic Camisa"}]}]}
   ]
  })};
 };
 const u="https://test.matchlatch.test/api/discover";
 const req=(body,origin)=>new Request(u,{method:"POST",
  headers:{"content-type":"application/json",...(origin?{origin}:{})},
  body:JSON.stringify(body)});
 const query={betaCode:"TEST_BETA_CODE_123456",slot:"shirt",q:"slim black organic cotton crew shirt",
  size:"M",color:"Black",max:100,
  profile:{aesthetic:"Minimalist",fit:"Slim",occasion:"Work",notes:"No leather"}};
 let response=await POST(req({...query,betaCode:"wrong"}));
 assert.equal(response.status,403);
 assert.equal(requests,0,"Bad code cannot incur web-search cost");
 response=await POST(req({...query,slot:"unknown"}));
 assert.equal(response.status,400);
 assert.equal(requests,0);
 response=await POST(req(query,"https://different.site"));
 assert.equal(response.status,403);
 assert.equal(requests,0);
 response=await POST(req(query));
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.sourceCount,2,"Only unique HTTPS provider-returned sources");
 assert.equal(result.sources[0].url,productURL);
 assert.equal(result.sources[0].kind,"product_page_reference");
 assert.equal(result.sources[0].cartEligible,false);
 assert.equal(result.sources[0].verifiedPrice,false);
 assert.equal(result.sources[0].verifiedStock,false);
 assert.equal(result.sources[1].kind,"research_reference");
 assert.equal(result.canAddToCart,false);
 assert.equal(result.mode,"research_only");
 assert.match(result.summary,/slim organic cotton/);
 assert.equal(upstream.store,false);
 assert.equal(upstream.tool_choice,"required");
 assert.equal(upstream.tools[0].type,"web_search");
 assert.ok(upstream.include.includes("web_search_call.action.sources"));
 assert.match(upstream.input,/No leather/);
 assert.match(upstream.input,/PERSONAL CURATION/);
 assert.doesNotMatch(JSON.stringify(result),/unit_mock_server_only|TEST_BETA_CODE_123456/);
 console.log("Web discovery mock: authorization, exact preference prompting, citations and no-cart invariant passed.");
}finally{
 globalThis.fetch=previous.fetch;
 for(const [k,v] of [["OPENAI_API_KEY",previous.api],["MATCHLATCH_BETA_CODE",previous.code],["OPENAI_WEB_MODEL",previous.model]])
  if(v===undefined)delete process.env[k];else process.env[k]=v;
}
