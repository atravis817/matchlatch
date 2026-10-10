// Isolated scheduler entry point. Logs metadata/counters, never catalog rows.
import {run} from './awin-import.mjs';
import {safeError} from './awin-feed-utils.mjs';
const output=console.log;
console.log=(value)=>{try{const data=JSON.parse(value);delete data.sample_products;output(JSON.stringify(data));}catch{output('Importer diagnostic omitted');}};
try{
 if(process.env.VERCEL_ENV!=='preview')throw Error('Preview only');
 await run({write:false,full:true,accessibleTestFeeds:true});
 if(process.argv.includes('--write'))await run({write:true,full:true,accessibleTestFeeds:true});
}catch(e){console.error(safeError(e));process.exitCode=1;}
finally{console.log=output;}
