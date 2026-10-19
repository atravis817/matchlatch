// C3 citation regression through the real shared extractor; route/consumer
// authentication, privacy and metering contracts live in test-store-research.mjs.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {extractResearch} from '../lib/commerce-discovery.mjs';
test('indexed citations remain references, normalized and deduplicated under the reviewed source policy',()=>{
 const url='https://nordstrom.com/s/fixture/123';
 const data={output:[{type:'web_search_call',status:'completed',action:{type:'search',sources:[{url,title:'Tool source'}]}},
  {type:'message',content:[{type:'output_text',text:'Untrusted product claims',annotations:[
   {type:'url_citation',url:url+'?utm_source=x',title:'Duplicate'},
   {type:'url_citation',url:'https://gap.com/browse/product.do?pid=456',title:'Cited reference'},
   {type:'url_citation',url:'https://example.com/p/outside-policy',title:'Denied'}]}]}]};
 const references=extractResearch(data);assert.equal(references.length,2);
 assert.equal(references[0].fields.productURL.value,url);
 assert.ok(references.every(r=>r.collection==='external_research'&&r.publishable===false&&r.fields.price===null&&r.fields.stock===null&&r.fields.variants===null));
 assert.equal(references[1].fields.productURL.value,'https://gap.com/browse/product.do?pid=456');
});
