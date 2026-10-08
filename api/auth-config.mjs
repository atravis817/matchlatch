function json(body,status=200) {
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}
export function GET() {
  // These are public browser configuration values, never privileged database/service keys.
  const url=process.env.SUPABASE_URL || "";
  const publishableKey=process.env.SUPABASE_PUBLISHABLE_KEY || "";
  if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(url)||!publishableKey) {
    return json({enabled:false});
  }
  return json({enabled:true,url,publishableKey});
}
