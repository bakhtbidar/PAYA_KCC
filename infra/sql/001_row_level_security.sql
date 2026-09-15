-- PAYA Control — PostgreSQL Row-Level Security (defense-in-depth for tenant isolation).
--
-- This is the database-level backstop behind the app-layer scoping in
-- apps/api/src/common/tenant-scope.service.ts (§2, Red gap: "tenant isolation
-- isn't enforced at the data layer"). It is NOT applied to the local SQLite dev
-- database (SQLite has no RLS) — apply this once the schema targets PostgreSQL
-- in staging/production:
--
--   psql "$DATABASE_URL" -f infra/sql/001_row_level_security.sql
--
-- Pattern: every request sets a session variable naming the restaurants the
-- current user may see (or 'ALL' for staff roles), via:
--   SELECT set_config('paya.accessible_restaurants', '<comma-separated ids | ALL>', true);
-- run at the start of each transaction/request. Policies below check it.

create or replace function paya_is_unrestricted() returns boolean as $$
  select current_setting('paya.accessible_restaurants', true) = 'ALL';
$$ language sql stable;

create or replace function paya_restaurant_allowed(restaurant_id text) returns boolean as $$
  select paya_is_unrestricted()
     or restaurant_id = any(string_to_array(current_setting('paya.accessible_restaurants', true), ','));
$$ language sql stable;

alter table "Restaurant" enable row level security;
create policy paya_restaurant_isolation on "Restaurant"
  using (paya_restaurant_allowed(id));

alter table "RestaurantSection" enable row level security;
create policy paya_section_isolation on "RestaurantSection"
  using (paya_restaurant_allowed("restaurantId"));

alter table "Equipment" enable row level security;
create policy paya_equipment_isolation on "Equipment"
  using (paya_restaurant_allowed("restaurantId"));

alter table "Document" enable row level security;
create policy paya_document_isolation on "Document"
  using (paya_restaurant_allowed("restaurantId"));

alter table "RestaurantUserAccess" enable row level security;
create policy paya_access_isolation on "RestaurantUserAccess"
  using (paya_restaurant_allowed("restaurantId"));

-- Customer, User, Role, AuditLog etc. stay staff-only at the application layer
-- (ADMIN / PROJECT_ENGINEER) rather than per-restaurant RLS — they aren't
-- restaurant-scoped rows.
