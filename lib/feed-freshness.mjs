// A successful feed download is source evidence, not a retailer-page check.
export function feedFreshness(sourceUpdatedAt,checkedAt=new Date().toISOString()){
 const checked=Date.parse(checkedAt),source=Date.parse(sourceUpdatedAt);
 if(!Number.isFinite(checked)||!Number.isFinite(source)||source>checked+300000)throw Error('Invalid feed freshness evidence');
 return {source_checked_at:new Date(checked).toISOString(),source_updated_at:new Date(source).toISOString(),valid_until:new Date(Math.min(checked,source)+86400000).toISOString(),evidence:'awin_feed_snapshot',retailer_independently_verified:false};
}
