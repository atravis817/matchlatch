/* MATCHLATCH Awin feed discovery.
 * Run in trusted Node 20+ server/CI, never in the browser:
 * AWIN_PRODUCT_FEED_API_KEY=... node scripts/awin-feed-discovery.mjs
 * Prints sanitized metadata only: no key, feed URLs or raw response.
 */
const key=process.env.AWIN_PRODUCT_FEED_API_KEY;
if(!key){console.error("Missing AWIN_PRODUCT_FEED_API_KEY");process.exitCode=1;}
else {
  const approved=new Set([117849,126793]); // Verified via connected publisher account on 2026-10-10.
  const endpoint="https://productdata.awin.com/datafeed/list/apikey/"+encodeURIComponent(key);
  function parseCSV(input){
    const records=[];let row=[],value="",quoted=false;
    for(let i=0;i<input.length;i++){
      const c=input[i];
      if(quoted){
        if(c==='"'&&input[i+1]==='"'){value+='"';i++;}
        else if(c==='"')quoted=false;
        else value+=c;
      } else if(c==='"')quoted=true;
      else if(c===','){row.push(value);value="";}
      else if(c==='\n'){row.push(value.replace(/\r$/,""));records.push(row);row=[];value="";}
      else value+=c;
    }
    if(quoted)throw Error("Unterminated CSV quoted field");
    if(value||row.length){row.push(value.replace(/\r$/,""));records.push(row);}
    return records;
  }
  try{
    const response=await fetch(endpoint,{signal:AbortSignal.timeout(20000),redirect:"error",headers:{accept:"text/csv"}});
    if(!response.ok)throw Error("Feed list HTTP "+response.status);
    const text=await response.text();
    if(text.length>4_000_000)throw Error("Feed list exceeds limit");
    const rows=parseCSV(text.replace(/^\uFEFF/,""));
    const header=(rows.shift()||[]).map(s=>s.trim().toLowerCase().replace(/[^a-z0-9]/g,""));
    const find=(...keys)=>header.findIndex(s=>keys.includes(s));
    const idx={id:find("advertiserid","merchantid"),name:find("advertisername","merchantname"),membership:find("membershipstatus"),feed:find("feedid"),updated:find("lastimported","lastupdated"),url:find("url")};
    if(idx.id<0||idx.feed<0||idx.url<0)throw Error("Unexpected Awin feed list column headers");
    const output=[];
    for(const row of rows){
      const advertiserId=Number(row[idx.id]);
      if(!approved.has(advertiserId))continue;
      let url;try{url=new URL(row[idx.url]||"");}catch{continue;}
      if(url.protocol!=="https:"||!["datafeed.api.productserve.com","productdata.awin.com"].includes(url.hostname))continue;
      output.push({advertiser_id:advertiserId,advertiser_name:row[idx.name]||"",feed_id:row[idx.feed],last_imported:row[idx.updated]||null,membership:row[idx.membership]||null});
    }
    console.log(JSON.stringify({ok:true,approved_advertisers:[...approved],total_feed_list_rows:rows.length,feed_count:output.length,headers:header,feeds:output},null,2));
  }catch(error){console.error("Awin feed discovery failed:",error.message);process.exitCode=1;}
}
