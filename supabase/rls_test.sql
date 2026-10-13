-- RLS isolation proof: run as two staff from different restaurants
-- 1) Restaurant A user must get 0 rows from Restaurant B menu:
-- set request.jwt.claims via supabase test helpers or:
-- select count(*) from menu_items where restaurant_id <> my_restaurant(); -- expect 0 for staff policy on write paths
-- 2) Manual checks:
-- select * from menu_items where restaurant_id = (select id from restaurants where slug='spice-route-cafe' limit 1);
-- Attempt cross-write should fail with RLS violation when authenticated as staff of another restaurant.
select 'rls-test-placeholder: wire to supabase test (pgTAP) in CI' as ok;
