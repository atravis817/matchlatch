-- Repair double-escaped live hostname checks; preserve RLS and publication gates.
-- [.] is a literal dot without SQL/backslash ambiguity.
begin;
alter table public.matchlatch_awin_partners
 drop constraint matchlatch_awin_partners_website_domain_check,
 add constraint matchlatch_awin_partners_website_domain_check
 check (website_domain ~ '^[a-z0-9.-]+[.][a-z]{2,}$');
alter table public.matchlatch_awin_products
 drop constraint matchlatch_awin_products_merchant_host_check,
 add constraint matchlatch_awin_products_merchant_host_check
 check (merchant_host ~ '^[a-z0-9.-]+[.][a-z]{2,}$');
commit;
