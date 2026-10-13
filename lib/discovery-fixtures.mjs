// Authored synthetic inputs only. No retailer data, downloads or reusable API responses.
const types=[['sneaker','Black sneakers',7900,'Numeric shoe size','10'],['jeans','Black slim-fit jeans',8900,'Waist size','32'],['jacket','Black fall jacket',9500,'Size','M'],['boot','Black ankle boots',9900,'Shoe size','10'],['dress','Black midi dress',6900,'Size','M'],['watch','Black dress watch',8500,null,null]];
export function discoveryFixtures(){
 const result={products:types.map(([type,title,amount,sizeName,size])=>({id:'gid://shopify/p/fixture-'+type,title:'Fictional '+title,brand:'Demo Studio',description:'Authored test fixture. No real merchandise or merchant relationship.',product_type:type,seller:{id:'fictional',name:'Fictional Studio Merchant',domain:'example.invalid'},media:[{type:'image',url:'https://example.invalid/illustrations/'+type+'.svg'}],variants:[{id:'gid://shopify/ProductVariant/fixture-'+type,title:'Demo variant',url:'https://example.invalid/products/'+type+'?variant=fixture-'+type+'&source=demo',price:{amount,currency:'USD'},availability:{available:true},options:[{name:'Color',label:'Black'},...(sizeName?[{name:sizeName,label:size,...(type==='jeans'?{unit:'in',size_system:'waist_inches'}:type==='sneaker'||type==='boot'?{size_system:'US'}:{})}]:[]),...(type==='jeans'?[{name:'Inseam length',label:'30',unit:'in'}]:[])]}]}))};
 const base=result.products[0].variants[0];
 for(const [suffix,label,available] of [['mixed','Black/White',true],['unknown','Midnight',true],['unavailable','Black',false]])result.products[0].variants.push({...structuredClone(base),id:'gid://shopify/ProductVariant/fixture-sneaker-'+suffix,title:'Demo '+suffix+' variant',availability:{available},options:[{name:'Color',label},...base.options.slice(1)]});
 return result;
}
export async function discoveryFixtureTransport(tool,args){
 const data=discoveryFixtures();
 if(tool==='search_catalog')return data;
 if(tool==='get_product'){const product=data.products.find(p=>p.id===args.id);return product?{product}:{products:[]};}
 throw Error('Fixture tool denied');
}
