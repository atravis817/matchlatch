// Preview prototype: deterministic projections only. No network, model or SQL.
// Classification is never merchant authorization or publication permission.
export const TAXONOMY_VERSION='1.0.0-preview';
const rows=[
 ['accessories','wristwear','watch','watch',['watch','watches','wristwatch','wristwatches','timepiece','timepieces','chronograph']],
 ['accessories','wristwear','watch_strap',null,['watch strap','watch band','watch bracelet']],
 ['footwear','casual','sneaker','shoes',['sneaker','sneakers','trainer','trainers','tennis shoe','tennis shoes']],
 ['footwear','boots','boot','shoes',['boot','boots','ankle boot','chelsea boot']],
 ['footwear','formal','loafer','shoes',['loafer','loafers','oxford shoe','derby shoe']],
 ['footwear','dress','heel','shoes',['heel','heels','pump','pumps']],
 ['footwear','casual','sandal','shoes',['sandal','sandals','slides','flip flops']],
 ['footwear','general','shoe','shoes',['shoe','shoes','footwear']],
 ['clothing','tops','t_shirt','shirt',['t-shirt','t-shirts','t shirt','tee','tees']],
 ['clothing','tops','shirt','shirt',['shirt','shirts','blouse','blouses','polo']],
 ['clothing','knitwear','sweater','shirt',['sweater','sweaters','jumper','jumpers','pullover','cardigan']],
 ['clothing','tops','hoodie','shirt',['hoodie','hoodies','sweatshirt','sweatshirts']],
 ['clothing','bottoms','jeans','pants',['jeans','denim trousers']],
 ['clothing','bottoms','trousers','pants',['trouser','trousers','pants','chinos']],
 ['clothing','bottoms','shorts','pants',['shorts']],
 ['clothing','bottoms','skirt',null,['skirt','skirts']],
 ['clothing','one_piece','dress',null,['dress','dresses','jumpsuit']],
 ['clothing','outerwear','jacket','jacket',['jacket','jackets','blazer','blazers']],
 ['clothing','outerwear','coat','jacket',['coat','coats','parka','parkas','overcoat']],
 ['accessories','headwear','hat','hat',['hat','hats','cap','caps','beanie','beanies']],
 ['accessories','neckwear','scarf','scarf',['scarf','scarves','wrap']],
 ['accessories','waistwear','belt','belt',['belt','belts']],
 ['clothing','hosiery','socks','socks',['sock','socks']],
 ['accessories','bags','bag',null,['bag','bags','handbag','tote bag','backpack']]
];
export const TAXONOMY=Object.freeze(rows.map(([category,subcategory,productType,legacySlot,aliases])=>Object.freeze({category,subcategory,productType,legacySlot,aliases:Object.freeze(aliases)})));
export const normalizeTerms=text=>String(text??'').normalize('NFKC').toLowerCase().replace(/[\u0000-\u001f]/g,' ').replace(/[‐‑–—]/g,'-').replace(/grey/g,'gray').replace(/\s+/g,' ').trim().slice(0,1000);
const escaped=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
function hits(text,field){
 return TAXONOMY.flatMap(t=>{const alias=[...t.aliases].sort((a,b)=>b.length-a.length).find(a=>new RegExp('\\b'+escaped(a)+'\\b','i').test(text));return alias?[{...t,field,alias}]:[];});
}
function specific(h,text=''){
 // Broad shoe/shirt words are not competing evidence when contained in a subtype.
 const types=new Set(h.map(x=>x.productType));const dressWatch=/\bdress\s+(?:(?:quartz|analog|digital|men['’]s|women['’]s|unisex)\s+)*watch\b/i.test(text);
 return h.filter(x=>!(x.productType==='shoe'&&h.some(y=>y.category==='footwear'&&y.productType!=='shoe'))&&!(x.productType==='shirt'&&types.has('t_shirt'))&&!(x.productType==='watch'&&types.has('watch_strap'))&&!(x.productType==='dress'&&types.has('watch')&&dressWatch));
}
export function classifyProduct(raw){
 const original={title:raw.title??'',sourceCategory:raw.sourceCategory??'',sourceProductType:raw.sourceProductType??'',legacySlot:raw.slot??'',description:raw.description??''};
 const normalizedTitle=normalizeTerms(original.title),title=specific(hits(normalizedTitle,'title'),normalizedTitle);
 const source=specific(hits(normalizeTerms(original.sourceProductType+' '+original.sourceCategory),'source_taxonomy'));
 const description=specific(hits(normalizeTerms(original.description),'description'));
 const evidence=title.length?title:source.length?source:description;
 const candidates=[...new Map(evidence.map(x=>[x.productType,x])).values()];
 const winner=candidates.length===1?candidates[0]:null;
 const reasons=[];if(!winner)reasons.push(candidates.length?'conflicting_product_types':'no_specific_type_evidence');
 const sourceConflict=winner&&source.some(s=>s.category!==winner.category||s.productType!==winner.productType&&s.productType!=='shoe');
 const legacyConflict=winner&&original.legacySlot&&winner.legacySlot!==original.legacySlot;
 if(sourceConflict)reasons.push('source_taxonomy_conflicts_with_title');
 if(legacyConflict)reasons.push('legacy_slot_conflict');
 if(winner?.field==='description')reasons.push('description_only_evidence');
 if(winner&&!winner.legacySlot)reasons.push('legacy_category_not_supported');
 const confidence=!winner?0:winner.field==='title'?0.95:winner.field==='source_taxonomy'?0.8:0.45;
 const reviewRequired=!winner||Boolean(sourceConflict)||Boolean(legacyConflict)||winner?.field==='description'||!winner?.legacySlot;
 return {version:TAXONOMY_VERSION,category:winner?.category??null,subcategory:winner?.subcategory??null,productType:winner?.productType??null,legacySlot:winner?.legacySlot??null,confidence,confidenceKind:'rule_strength_not_probability',status:reviewRequired?'needs_review':'classified',reviewRequired,reasons,contextRules:winner?.productType==='watch'&&/\bdress\b/.test(normalizedTitle)?['dress_watch_modifier_disambiguation']:[],evidence:evidence.map(x=>({field:x.field,matchedAlias:x.alias,productType:x.productType,rule:'word_boundary_v1'})),original};
}
export function normalizeQuery(text){
 const normalized=normalizeTerms(text);const matches=specific(hits(normalized,'request'),normalized);
 return {original:String(text??''),normalized,productTypes:[...new Set(matches.map(x=>x.productType))],categories:[...new Set(matches.map(x=>x.category))],legacySlots:[...new Set(matches.map(x=>x.legacySlot).filter(Boolean))],ambiguous:new Set(matches.map(x=>x.productType)).size>1};
}
export function colorEvidence(label){
 const original=String(label??''),normalized=normalizeTerms(label),colors=normalized.match(/\b(black|white|gray|blue|navy|green|olive|red|pink|brown|beige|silver|gold)\b/g)||[];
 const families=[...new Set(colors)];return {original,normalized,families,primary:null,status:families.length?'source_label_only':'unknown',exactSolid:families.length===1&&normalized===families[0]};
}
