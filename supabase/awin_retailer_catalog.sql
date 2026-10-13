-- MATCHLATCH POC-05: Awin affiliate retail partner + fashion feed staging.
-- Partners are NOT auto-enrolled. No products are published by this migration.
-- Catalog data is readable only when explicitly verified, current, and enabled.
create table if not exists public.matchlatch_awin_partners (
 advertiser_id integer primary key check (advertiser_id > 0),
 name text not null check (length(name) between 2 and 120),
 website_domain text not null check (website_domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
 category text not null,
 membership_status text not null default 'not_joined'
  check (membership_status in ('not_joined','pending','joined','suspended','rejected')),
 feed_status text not null default 'unverified'
  check (feed_status in ('unverified','pending','verified','stale','unavailable')),
 deeplink_supported boolean not null default false,
 browse_enabled boolean not null default false,
 checkout_enabled boolean not null default false,
 membership_checked_at timestamptz,
 feed_checked_at timestamptz,
 updated_at timestamptz not null default now(),
 check (not browse_enabled or (membership_status = 'joined' and feed_status = 'verified')),
 check (not checkout_enabled or browse_enabled)
);
alter table public.matchlatch_awin_partners enable row level security;
revoke all on table public.matchlatch_awin_partners from anon, authenticated;
-- No anon/authenticated SELECT policy: membership state is backend-only.

create table if not exists public.matchlatch_awin_products (
 advertiser_id integer not null references public.matchlatch_awin_partners(advertiser_id),
 source_variant_id text not null check (length(source_variant_id) between 1 and 200),
 source_product_id text not null check (length(source_product_id) between 1 and 200),
 slot text not null check (slot in ('hat','scarf','jacket','shirt','watch','belt','pants','socks','shoes')),
 title text not null check (length(title) between 3 and 250),
 description text not null default '',
 brand text not null default '',
 material text not null default '',
 fit text not null default '',
 size text not null default '',
 color text not null default '',
 image_url text not null default '',
 product_url text not null check (product_url ~ '^https://'),
 affiliate_url text not null default '' check (affiliate_url = '' or affiliate_url ~ '^https://'),
 merchant_name text not null,
 merchant_host text not null check (merchant_host ~ '^[a-z0-9.-]+\.[a-z]{2,}$'),
 price_usd numeric(10,2) not null check (price_usd > 0 and price_usd <= 100000),
 original_price_usd numeric(10,2),
 currency text not null default 'USD' check (currency = 'USD'),
 size_system text not null default '',
 available boolean not null default false,
 stock_status text not null default 'unknown',
 shipping_us_eligible boolean not null default false,
 shipping_cost_usd numeric(10,2),
 feed_imported_at timestamptz not null,
 valid_until timestamptz not null,
 is_public boolean not null default false,
 search_document tsvector generated always as (
  to_tsvector('simple',
    coalesce(title,'') || ' ' || coalesce(description,'') || ' ' ||
    coalesce(brand,'') || ' ' || coalesce(material,'') || ' ' ||
    coalesce(slot,'') || ' ' || coalesce(color,'') || ' ' ||
    coalesce(fit,''))
 ) stored,
 primary key (advertiser_id, source_variant_id),
 check (original_price_usd is null or original_price_usd >= price_usd),
 check (shipping_cost_usd is null or shipping_cost_usd >= 0)
);
create index if not exists matchlatch_awin_products_search_idx
 on public.matchlatch_awin_products using gin (search_document);
create index if not exists matchlatch_awin_products_filters_idx
 on public.matchlatch_awin_products (slot, price_usd, size, color)
 where is_public and available;
alter table public.matchlatch_awin_products enable row level security;
revoke all on table public.matchlatch_awin_products from anon, authenticated;
grant select on table public.matchlatch_awin_products to anon, authenticated;
drop policy if exists "matchlatch_awin_catalog_public_only" on public.matchlatch_awin_products;
create policy "matchlatch_awin_catalog_public_only"
 on public.matchlatch_awin_products for select to anon, authenticated
 using (is_public and available and shipping_us_eligible and valid_until > now());

-- An internal trigger stops erroneous publication, even under service-role writes.
create schema if not exists matchlatch_internal;
revoke all on schema matchlatch_internal from public, anon, authenticated;
create or replace function matchlatch_internal.awin_require_approved_partner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.is_public and not exists (
  select 1 from public.matchlatch_awin_partners p
  where p.advertiser_id=new.advertiser_id
   and p.membership_status='joined'
   and p.feed_status='verified'
   and p.browse_enabled
   and p.membership_checked_at > now() - interval '24 hours'
   and p.feed_checked_at > now() - interval '24 hours'
 ) then
  raise exception 'Awin listing requires current joined membership and verified feed';
 end if;
 return new;
end;
$$;
revoke all on function matchlatch_internal.awin_require_approved_partner() from public, anon, authenticated;
drop trigger if exists matchlatch_awin_publish_gate on public.matchlatch_awin_products;
create trigger matchlatch_awin_publish_gate before insert or update of is_public,advertiser_id
 on public.matchlatch_awin_products for each row execute function matchlatch_internal.awin_require_approved_partner();

-- Downgraded membership, stale feeds or disabled browsing immediately unpublish offers.
create or replace function matchlatch_internal.awin_unpublish_on_partner_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
 if new.membership_status <> 'joined' or new.feed_status <> 'verified'
  or not new.browse_enabled
  or new.membership_checked_at is null or new.membership_checked_at <= now() - interval '24 hours'
  or new.feed_checked_at is null or new.feed_checked_at <= now() - interval '24 hours' then
    update public.matchlatch_awin_products set is_public=false
     where advertiser_id=new.advertiser_id and is_public;
 end if;
 return new;
end;
$$;
revoke all on function matchlatch_internal.awin_unpublish_on_partner_change() from public, anon, authenticated;
drop trigger if exists matchlatch_awin_unpublish_partner on public.matchlatch_awin_partners;
create trigger matchlatch_awin_unpublish_partner
 after update of membership_status,feed_status,browse_enabled,membership_checked_at,feed_checked_at
 on public.matchlatch_awin_partners for each row execute function matchlatch_internal.awin_unpublish_on_partner_change();

-- The six advertisers were checked live October 9 and were all "Not joined".
-- Insert is non-destructive and intentionally leaves all activation flags false.
insert into public.matchlatch_awin_partners
 (advertiser_id,name,website_domain,category,membership_status,feed_status,deeplink_supported)
 values
 (6016,'W Concept (US)','wconcept.com','Designer fashion','not_joined','unverified',true),
 (16225,'Suitsupply (US)','suitsupply.com','Tailored menswear','not_joined','unverified',true),
 (15378,'MESHKI US','meshki.us','Womenswear & occasion','not_joined','unverified',true),
 (15431,'Under Armour US','underarmour.com','Sportswear','not_joined','unverified',true),
 (83063,'Loci Wear Ltd','lociwear.com','Footwear','not_joined','unverified',true),
 (106789,'Varley US','varley.com','Womenswear','not_joined','unverified',true)
 on conflict (advertiser_id) do nothing;
