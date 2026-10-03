-- DPRO GREEN / KASUYA SHOP SALES-ONLY CURRENT OPERATION
-- 2026-10-03
-- Purpose:
--   Public SHOP is currently sales-only.
--   Future-use rental product data is NOT deleted.
--   Only the SHOP-wide rental feature flags are turned OFF.

begin;

update public.green_shop_settings
set
  rental = false,
  rental_delivery = false,
  updated_at = now()
where facility_id = (
  select id
  from public.green_facilities
  where facility_code = 'cl_000001_green'
  limit 1
);

commit;

-- Verification
select
  enabled,
  online_shop,
  ordering_enabled,
  delivery,
  pickup,
  reservation,
  local_delivery,
  rental,
  rental_delivery,
  gift,
  square_enabled
from public.green_shop_settings
where facility_id = (
  select id
  from public.green_facilities
  where facility_code = 'cl_000001_green'
  limit 1
);
