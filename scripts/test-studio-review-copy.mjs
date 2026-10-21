import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
const normalize=createRequire(import.meta.url)('../studio-request.js').normalizeStudioRequest;
const flow=readFileSync(new URL('../studio-flow.js',import.meta.url),'utf8');
const helpers=flow.slice(flow.indexOf('  function reviewLabel'),flow.indexOf('  function renderReview'));
const ui=vm.runInNewContext(helpers+';({reviewLabel,reviewValue,reviewIssue,reviewSource})');
test('actual normalizer conflicts show both values without resolving or discarding them',()=>{
 const input={prompt:'blue shirt up to $100',manualPreferences:{color:'red',max:100}};
 const before=JSON.stringify(input),result=normalize(input);
 assert.match(ui.reviewIssue(result.conflicts[0]),/request “blue”; manual choice “red”/);
 assert.equal(result.conflicts.length,1);assert.equal(JSON.stringify(input),before);
});
test('actual unsupported size systems remain visible blockers, never silently merged',()=>{
 const result=normalize({prompt:'shirt',manualPreferences:{max:'100',topSize:'M',topSystem:'US'}});
 const messages=result.unsupportedOrUnknown.map(ui.reviewIssue).join(' ');
 assert.match(messages,/Top size cannot be applied/);assert.match(messages,/Top size system cannot be applied/);
 assert.ok(result.unsupportedOrUnknown.length);assert.match(ui.reviewIssue('future_requirement'),/Unknown requirement.*future_requirement/);
});
test('summary uses merchandise and context labels, provenance and readable values',()=>{
 assert.match(ui.reviewLabel('max'),/Maximum merchandise spend.*tax and shipping/);
 for(const key of ['occasion','style'])assert.match(ui.reviewLabel(key),/context only; not ranked/);
 assert.equal(ui.reviewSource('manual'),'From your choices');assert.equal(ui.reviewSource('savedDefault'),'From saved preferences');
 assert.equal(ui.reviewValue({shoeSystem:'US',shoeSize:'10'}),'Shoe size system: US; Shoe size: 10');
 assert.match(ui.reviewIssue('unverified_hard_constraint:needBy'),/Arrival deadline cannot be verified/);
 assert.match(ui.reviewIssue({field:'color',reason:'required_color_excluded'}),/also a color to avoid/);
});
const shell=readFileSync(new URL('../app-shell.js',import.meta.url),'utf8');
const availability=vm.runInNewContext('('+shell.slice(shell.indexOf('function sourceAvailability('),shell.indexOf('function renderProfileLinks()'))+')');
test('Store states distinguish inaccessible sources, empty eligibility and unknown evidence',()=>{
 for(const [state,expected]of Object.entries({owner_required:'requires verified owner sign-in',disabled:'is turned off',unavailable:'could not be reached',empty:'has no eligible products',future:'availability is unknown'}))assert.ok(availability({shopify:{status:state}}).includes('Shopify catalog '+expected));
});

// Exercise the real producer with local fixtures; no provider or model transport.
import {unifiedDiscovery,unifiedPolicy} from '../lib/unified-discovery.mjs';
import {discoveryFixtures} from '../lib/discovery-fixtures.mjs';
test('actual discovery producer states receive accurate source copy without mutating evidence',async()=>{
 const policy=unifiedPolicy({VERCEL_ENV:'preview',MATCHLATCH_UNIFIED_DISCOVERY_ENABLED:'true'});
 const fail=async()=>{throw Error('fixture failure');};
 const cases=[
  [{},'results','empty'],
  [{owner:false},'owner_required','empty'],
  [{policy:{...policy,shopifyEvaluation:false}},'disabled','empty'],
  [{shopify:fail,awin:fail},'unavailable','unavailable'],
  [{shopify:async()=>({products:[]})},'empty','empty'],
  [{awinConfigured:false},'results','not_configured'],
  [{shopify:async()=>({products:[]}),awin:async()=>[{source:'awin',productId:'awin:123:p',variantId:'awin:123:v',slot:'shoes',title:'Black sneakers',merchant:'Fixture',color:'Black',merchantProductUrl:'https://fixture.invalid/products/shoes',image:'https://fixture.invalid/image.jpg',price:50,currency:'USD',available:true,checkedAt:new Date().toISOString()}]},'empty','results']
 ];
 const phrases={results:'returned eligible product listings',empty:'has no eligible products',owner_required:'requires verified owner sign-in',disabled:'is turned off',unavailable:'could not be reached',not_configured:'is not configured'};
 for(const [options,shopify,awin] of cases){
  const result=await unifiedDiscovery({query:'black sneakers',slot:'shoes',max:100},{owner:true,policy,awinConfigured:true,shopify:async()=>discoveryFixtures(),awin:async()=>[],...options});
  assert.equal(result.sources.shopify.status,shopify);assert.equal(result.sources.awin.status,awin);
  const before=JSON.stringify(result),copy=availability(result.sources);
  assert.equal(copy,'Shopify catalog '+phrases[shopify]+'. Reviewed product feeds '+phrases[awin]+'.');
  assert.equal(JSON.stringify(result),before);
  assert.doesNotMatch(copy,/stock|fit|rights|model|AI|verified products/i);
 }
});
test('legacy checked states and genuinely unknown or absent source evidence remain distinct',()=>{
 for(const status of ['available','ok'])assert.match(availability({shopify:{status}}),/Shopify catalog was checked\./);
 for(const sources of [undefined,null,{}, {shopify:{}},{shopify:{status:'future'}},{shopify:{status:null}}])assert.match(availability(sources),/Shopify catalog availability is unknown\./);
});
