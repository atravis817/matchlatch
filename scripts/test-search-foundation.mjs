import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('every root page excludes Preview indexing',()=>{for(const p of readdirSync(new URL('../',import.meta.url)).filter(p=>p.endsWith('.html')))assert.match(read(p),/<meta name="robots" content="noindex,\s*nofollow">/);});
test('deployment crawler policy and sitemap do not publish private routes',()=>{const config=JSON.parse(read('vercel.json'));assert.ok(config.headers.some(x=>x.source==='/(.*)'&&x.headers.some(h=>h.key==='X-Robots-Tag'&&h.value.includes('noindex'))));assert.match(read('robots.txt'),/Disallow: \/\n/);assert.doesNotMatch(read('sitemap.xml'),/<loc>/);});
const origin='https://matchlatch.company/';
const documents=()=>Object.fromEntries(['index.html','about.html'].map(p=>[p,read(p)]));
function validateGraphs(pages){
  const shared=[];
  for(const [path,html] of Object.entries(pages)){
    const canonical=origin+(path==='index.html'?'':path);
    assert.deepEqual([...html.matchAll(/<link rel="canonical" href="([^"]+)">/g)].map(m=>m[1]),[canonical],path+' canonical');
    const scripts=[...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)];
    assert.equal(scripts.length,1,path+' graph count');
    const graph=JSON.parse(scripts[0][1]);
    assert.equal(graph['@context'],'https://schema.org');
    assert.deepEqual(graph['@graph'].map(x=>x['@type']),['Organization','WebSite','WebPage']);
    const [org,site,page]=graph['@graph'];
    assert.equal(new Set(graph['@graph'].map(x=>x['@id'])).size,3,'unique entity IDs');
    assert.equal(org['@id'],origin+'#organization');assert.equal(org.url,origin);assert.equal(org.name,'MATCHLATCH');
    assert.equal(site['@id'],origin+'#website');assert.equal(site.url,origin);assert.equal(site.name,'MATCHLATCH');
    assert.deepEqual(site.publisher,{'@id':org['@id']});
    assert.equal(page['@id'],canonical+'#page');assert.equal(page.url,canonical);
    assert.deepEqual(page.isPartOf,{'@id':site['@id']});
    const ids=new Set(graph['@graph'].map(x=>x['@id']));
    const references=value=>{if(!value||typeof value!=='object')return;
      if(Object.keys(value).length===1&&value['@id'])assert.ok(ids.has(value['@id']),'resolved reference');
      for(const child of Object.values(value))references(child);
    };references(graph);
    assert.doesNotMatch(JSON.stringify(graph),/aggregateRating|Offer|Product|founder|review/);
    assert.deepEqual([...html.matchAll(/<meta property="og:url" content="([^"]+)">/g)].map(m=>m[1]),[canonical]);
    shared.push([org,site]);
  }
  assert.deepEqual(shared[0],shared[1],'cross-page shared entities');
}
test('complete canonical, graph, social and cross-page entity agreement',()=>validateGraphs(documents()));
const mutateGraph=(html,change)=>html.replace(/(<script type="application\/ld\+json">)(.*?)(<\/script>)/s,(_,a,json,b)=>{
  const graph=JSON.parse(json);change(graph);return a+JSON.stringify(graph)+b;
});
const mutations={
  'wrong canonical':h=>h.replace('rel="canonical" href="'+origin,'rel="canonical" href="https://wrong.invalid/'),
  'duplicate canonical':h=>h.replace('</head>','<link rel="canonical" href="'+origin+'about.html"></head>'),
  'wrong social URL':h=>h.replace('property="og:url" content="'+origin,'property="og:url" content="https://wrong.invalid/'),
  'wrong context':h=>mutateGraph(h,g=>g['@context']='https://wrong.invalid'),
  'wrong organization ID':h=>mutateGraph(h,g=>g['@graph'][0]['@id']=origin+'#other'),
  'wrong site ID':h=>mutateGraph(h,g=>g['@graph'][1]['@id']=origin+'#other'),
  'wrong page ID':h=>mutateGraph(h,g=>g['@graph'][2]['@id']=origin+'#page'),
  'wrong page URL':h=>mutateGraph(h,g=>g['@graph'][2].url=origin),
  'wrong brand':h=>mutateGraph(h,g=>g['@graph'][0].name='Other'),
  'wrong organization URL':h=>mutateGraph(h,g=>g['@graph'][0].url=origin+'other'),
  'wrong site URL':h=>mutateGraph(h,g=>g['@graph'][1].url=origin+'other'),
  'dangling publisher':h=>mutateGraph(h,g=>g['@graph'][1].publisher['@id']=origin+'#missing'),
  'wrong publisher type':h=>mutateGraph(h,g=>g['@graph'][1].publisher['@id']=origin+'#website'),
  'dangling isPartOf':h=>mutateGraph(h,g=>g['@graph'][2].isPartOf['@id']=origin+'#missing'),
  'wrong isPartOf type':h=>mutateGraph(h,g=>g['@graph'][2].isPartOf['@id']=origin+'#organization'),
  'duplicate IDs':h=>mutateGraph(h,g=>g['@graph'][2]['@id']=g['@graph'][1]['@id']),
  'cross-page drift':h=>mutateGraph(h,g=>g['@graph'][0].description='Unilateral identity change'),
  'inventory entity':h=>mutateGraph(h,g=>g['@graph'].push({'@type':'Product',name:'Private fixture'})),
  'invented rating':h=>mutateGraph(h,g=>g['@graph'][0].aggregateRating={'@type':'AggregateRating',ratingValue:5}),
  'missing graph':h=>h.replace(/<script type="application\/ld\+json">.*?<\/script>/s,''),
  'malformed graph':h=>h.replace('"@context"','BROKEN')
};
for(const [name,mutate] of Object.entries(mutations))test('graph regression rejects '+name,()=>{
  const pages=documents();const altered=mutate(pages['about.html']);
  assert.notEqual(altered,pages['about.html'],'mutation must change source');pages['about.html']=altered;
  assert.throws(()=>validateGraphs(pages));
});
test('customer answers disclose beta and wardrobe limitations',()=>{const html=read('about.html');assert.match(html,/Live outfit generation and purchases remain disabled/);assert.match(html,/owned-first outfit workflow are still in development/);assert.match(html,/owner-only Preview evaluation/);assert.match(html,/retailer-hosted checkout separately/);});
