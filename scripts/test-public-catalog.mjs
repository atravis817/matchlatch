import assert from "node:assert/strict";
import {RETAILERS,REVIEW_QUEUE,researchSources,classifyPublicReference as classify} from "../lib/public-retailer-research.mjs";
assert.equal(RETAILERS.length,3);
assert.equal(classify("https://www.uniqlo.com/us/en/products/E123"),null);
assert.equal(classify("https://www.gap.com/browse/product.do?pid=123")?.classification,"public_research_reference");
assert.equal(classify("https://www.gap.com/browse/search.do?q=pants"),null);
assert.equal(classify("https://www.gap.com/productData.do"),null);
assert.equal(classify("https://www.nordstrom.com/s/example-item/123")?.cartEligible,false);
assert.equal(classify("https://www.nordstrom.com/api/product/123"),null);
assert.equal(classify("http://www.gap.com/browse/product.do"),null);
assert.equal(classify("https://www.gap.com.evil.example/browse/product.do"),null);
assert.equal(classify("https://shop.other.example/p/1"),null);
assert.equal(classify("https://www.gap.com/checkout/step"),null);
assert.equal(REVIEW_QUEUE.length,4);
assert.equal(classify("https://www.everlane.com/products/example"),null);
const safe=researchSources([
 {url:"https://www.gap.com/browse/product.do?pid=123",title:"Public source"},
 {url:"https://www.gap.com/browse/product.do?pid=123",title:"Duplicate"},
 {url:"https://www.uniqlo.com/us/en/products/E123",title:"Excluded"},
 {url:"https://www.nordstrom.com/s/example-item/123",title:"Research"},
 {url:"https://www.gap.com/browse/search.do?q=shoes",title:"Disallowed route"}
]);
assert.equal(safe.length,2);
assert.equal(safe.every(x=>x.cartEligible===false&&x.checkoutEligible===false&&x.verifiedShipping===false),true);
assert.equal(safe.every(x=>x.classification==="public_research_reference"&&x.kind==="research_reference"),true);
console.log("PASS POC-01 policy guardrails");
