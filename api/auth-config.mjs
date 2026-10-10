function json(body,status=200) {
  return new Response(JSON.stringify(body),{
    status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
function isPublicKey(key) {
  if(typeof key!=="string")return false;
  if(/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))return true;
  // Support the older Supabase anon JWT, but NEVER expose a service-role JWT.
  if(key.startsWith("eyJ")){
    try {
      const payload=JSON.parse(Buffer.from(key.split(".")[1]||"","base64url").toString("utf8"));
      return payload.role==="anon";
    }catch{return false;}
  }
  return false;
}
export function GET() {
  // This endpoint exposes ONLY a project's public browser key.
  // Never set SUPABASE_PUBLISHABLE_KEY to a service-role or sb_secret_ key.
  const url=(process.env.SUPABASE_URL||"https://odxqxymwlwnbqginqems.supabase.co").trim();
  const key=(process.env.SUPABASE_PUBLISHABLE_KEY||"sb_publishable_-sWs8xMX6F2r9nZOMJk6oA_9Wxyt5DZ").trim();
  if(!/^https:\/\/[A-Za-z0-9.-]+\.supabase\.co$/.test(url)||!isPublicKey(key)){
    return json({enabled:false});
  }
  return json({enabled:true,url,publishableKey:key,passkeysEnabled:process.env.MATCHLATCH_PASSKEYS_ENABLED==="true"});
}
