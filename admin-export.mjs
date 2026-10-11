// Exports use the already-authorized aggregate snapshot; no additional privileged requests.
const cell=value=>{let text=value===null||value===undefined?'':String(value);if(typeof value==='string'&&/^[\s]*[=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
export function exportCSV(snapshot,view='overview'){
 const rows=[['section','metric','current','previous','change','change_percent','unit','note','snapshot_at','period_start','period_end']];
 for(const [name,s] of Object.entries(snapshot.sections)){if(view!=='overview'&&view!==name)continue;if(s.status!=='ok'){rows.push([name,'Source unavailable',null,null,null,null,'',s.reason,snapshot.generatedAt,snapshot.period.start,snapshot.period.end]);continue;}
  for(const m of s.metrics)rows.push([name,m.label,m.current,m.previous,m.change,m.changePercent,m.unit,[s.scope,m.note].filter(Boolean).join(' '),snapshot.generatedAt,snapshot.period.start,snapshot.period.end]);
  for(const trend of s.series||[])for(const p of trend.points)rows.push([name,trend.label+' / '+p.date,p.value,null,null,null,'count','UTC partial boundary days; selected rolling window only.',snapshot.generatedAt,snapshot.period.start,snapshot.period.end]);
  for(const [dimension,points] of Object.entries(s.breakdowns||{}))for(const p of points)rows.push([name,dimension+' / '+p.label,p.value,null,null,null,'count','Top 40 groups; current snapshot or stated section period.',snapshot.generatedAt,snapshot.period.start,snapshot.period.end]);
 }
 for(const u of snapshot.unavailable)rows.push(['not_collected',u.label,null,null,null,null,'',u.reason,snapshot.generatedAt,snapshot.period.start,snapshot.period.end]);
 return '\ufeff'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
}
export function exportJSON(snapshot,view='overview'){return JSON.stringify({...snapshot,exportView:view,sections:view==='overview'?snapshot.sections:{[view]:snapshot.sections[view]}},null,2);}
