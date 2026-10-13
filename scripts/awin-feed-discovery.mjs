// Run independently of the website build in trusted Node.js 20+.
import {discoverFeeds,APPROVED_ADVERTISERS,feedMetadata,safeError} from './awin-feed-utils.mjs';
try {
 const result=await discoverFeeds();const feeds=result.rows.map(feedMetadata);
 const approved=feeds.filter(feed=>APPROVED_ADVERTISERS.has(feed.advertiser_id));
 const membership_counts={};for(const feed of feeds){const status=feed.membership||'not_supplied';membership_counts[status]=(membership_counts[status]||0)+1;}
 console.log(JSON.stringify({stage:'feed-discovery',ok:true,http_status:result.http_status,total_feed_list_rows:feeds.length,headers:result.headers,approved_advertisers:[...APPROVED_ADVERTISERS],feed_count:approved.length,membership_counts,feeds:approved,other_joined_feeds:feeds.filter(feed=>!APPROVED_ADVERTISERS.has(feed.advertiser_id)&&feed.membership?.toLowerCase()==='joined'),other_feed_sample:feeds.filter(feed=>!APPROVED_ADVERTISERS.has(feed.advertiser_id)).slice(0,5),download_bytes:result.download_bytes},null,2));
} catch(error) { console.error('Awin feed discovery failed:',safeError(error));process.exitCode=1; }
