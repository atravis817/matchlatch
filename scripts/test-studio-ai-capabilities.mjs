import test from 'node:test';
import assert from 'node:assert/strict';
import {GET} from '../api/catalog.mjs';
const original={...process.env},fetchOriginal=globalThis.fetch;
process.env.VERCEL_ENV='preview';process.env.MATCHLATCH_SHOPIFY_FIRST_PHASE='true';
process.env.MATCHLATCH_SHOPIFY_PREVIEW_SUPABASE_URL='https://lqxeizvrdxuhzvipmlkl.supabase.co';
process.env.MATCHLATCH_SHOPIFY_PREVIEW_SERVICE_KEY='synthetic-only';
let calls=0,fail=false;
globalThis.fetch=async url=>{calls++;assert.match(String(url),/\/rest\/v1\/matchlatch_shopify_products\?/);if(fail)throw Error('synthetic failure');return Response.json([]);};
const get=async()=>{const r=await GET(new Request('https://preview.invalid/api/catalog?mode=capabilities'));assert.equal(r.status,200);return r.json();};
test('configuration advertisement is user-only, never photo/connection/legacy readiness or access proof',async()=>{
 process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY='synthetic-only';calls=0;const d=await get();assert.equal(calls,1);assert.equal(d.userInputAIConfigured,true);assert.equal(d.userInputAIConnectionVerified,false);assert.equal(d.userInputAIScope,'user_input_only');for(const key of ['aiReady','aiConfigured','aiConnectionVerified','photo','fit','delivery','catalogAvailable'])assert.equal(d[key],false,key);assert.ok(!JSON.stringify(d).includes('synthetic-only'));
});
test('missing model configuration never advertises user-only AI configuration',async()=>{delete process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY;const d=await get();assert.equal(d.userInputAIConfigured,false);assert.equal(d.aiReady,false);});
test('catalog failure leaves configuration distinct from verified connection or eligible coverage',async()=>{process.env.MATCHLATCH_PREVIEW_OPENAI_API_KEY='synthetic-only';fail=true;const d=await get();assert.equal(d.userInputAIConfigured,true);assert.equal(d.userInputAIConnectionVerified,false);assert.equal(d.catalogAvailable,false);});
test.after(()=>{process.env=original;globalThis.fetch=fetchOriginal;});
