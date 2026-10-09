-- POC-06 registry expansion for the first verified joined Awin programmes.
-- This is safe on fresh database installs. No feed or browse activation is assumed.
-- Membership must ALWAYS be checked against the Awin joined endpoint at runtime.
insert into public.matchlatch_awin_partners
 (advertiser_id,name,website_domain,category,membership_status,feed_status,
  deeplink_supported,browse_enabled,checkout_enabled)
values
 (117849,'ZazzMode','zazzmode.com','Statement fashion','not_joined','unverified',true,false,false),
 (126793,'Cacio Pepe (US)','caciopepebrand.com','Menswear essentials','not_joined','unverified',true,false,false)
on conflict (advertiser_id) do nothing;
