-- Directory media and service visual customization.
-- Additive tenant-scoped fields used by customer and service detail/edit surfaces.

alter table public.customers
  add column if not exists avatar_url text;

alter table public.customers
  drop constraint if exists customers_avatar_url_check;
alter table public.customers
  add constraint customers_avatar_url_check
  check (avatar_url is null or char_length(trim(avatar_url)) between 8 and 2048);

alter table public.services
  add column if not exists image_url text,
  add column if not exists icon_key text,
  add column if not exists color_hex text;

alter table public.services
  drop constraint if exists services_image_url_check,
  drop constraint if exists services_icon_key_check,
  drop constraint if exists services_color_hex_check;
alter table public.services
  add constraint services_image_url_check
  check (image_url is null or char_length(trim(image_url)) between 8 and 2048),
  add constraint services_icon_key_check
  check (icon_key is null or icon_key ~ '^[a-z0-9_-]{1,40}$'),
  add constraint services_color_hex_check
  check (color_hex is null or color_hex ~ '^#[0-9A-Fa-f]{6}$');

create index if not exists customers_tenant_avatar_idx
  on public.customers (tenant_id)
  where avatar_url is not null;

create index if not exists services_tenant_visual_idx
  on public.services (tenant_id, color_hex, icon_key)
  where color_hex is not null or icon_key is not null or image_url is not null;

comment on column public.customers.avatar_url is 'Optional customer profile image URL; tenant-scoped by customers. Prefer Supabase Storage signed/public URL managed server-side.';
comment on column public.services.image_url is 'Optional service image URL for catalog and scheduling surfaces.';
comment on column public.services.icon_key is 'Optional UI icon key for service identification.';
comment on column public.services.color_hex is 'Optional service accent color in #RRGGBB format.';