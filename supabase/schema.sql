-- ============================================================================
-- Product Showcase + QR Generator — database schema
-- Paste this whole file into the Supabase SQL Editor and run it once.
-- ============================================================================

-- PRODUCTS
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price numeric not null default 0,
  description text,
  extra_notes text,
  created_at timestamptz not null default now()
);

-- PRODUCT IMAGES
create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- FEEDBACK
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  visitor_name text,
  message text not null,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

-- Helpful indexes for the public page / dashboard ordering
create index if not exists product_images_product_id_idx on product_images (product_id, sort_order);
create index if not exists feedback_product_id_idx on feedback (product_id, created_at desc);

-- Enable Row Level Security
alter table products enable row level security;
alter table product_images enable row level security;
alter table feedback enable row level security;

-- PUBLIC READ for products and images (so the public page works)
create policy "public read products" on products
  for select using (true);
create policy "public read product_images" on product_images
  for select using (true);

-- PUBLIC INSERT for feedback (visitors leave feedback without login)
create policy "public insert feedback" on feedback
  for insert with check (true);
create policy "public read feedback" on feedback
  for select using (true);

-- OWNER (any authenticated user) can do everything on products/images.
-- Because there is exactly one auth user, "authenticated" == the owner.
create policy "owner all products" on products
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "owner all product_images" on product_images
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
create policy "owner manage feedback" on feedback
  for all using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- ============================================================================
-- STORAGE POLICIES
-- ----------------------------------------------------------------------------
-- These apply to the `product-images` bucket. Create that bucket first
-- (Storage -> New bucket -> name "product-images" -> Public), THEN run this
-- block (it is also reproduced in the README).
--
-- Public read so the gallery images load for visitors; writes restricted to
-- the authenticated owner.
-- ============================================================================

create policy "public read product-images"
  on storage.objects for select
  using ( bucket_id = 'product-images' );

create policy "owner insert product-images"
  on storage.objects for insert to authenticated
  with check ( bucket_id = 'product-images' );

create policy "owner update product-images"
  on storage.objects for update to authenticated
  using ( bucket_id = 'product-images' )
  with check ( bucket_id = 'product-images' );

create policy "owner delete product-images"
  on storage.objects for delete to authenticated
  using ( bucket_id = 'product-images' );
