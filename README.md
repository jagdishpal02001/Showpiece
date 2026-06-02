# Product Showcase + QR Generator

A single-owner product showcase tool. The owner logs into a private dashboard,
creates products (clothes, glasses, etc.) with multiple photos, a title, price,
description and notes. Saving a product produces a public page at a unique URL,
plus a downloadable/shareable **QR code** that points at it. Public visitors open
the page (no login), browse the gallery and leave feedback. The owner manages
everything — products, images, and feedback — from the dashboard.

There is exactly **one owner, forever**. No signup, no multi-tenant logic.

## Tech stack

- **React 18 + Vite** (JavaScript / JSX)
- **React Router v6**
- **Tailwind CSS**
- **Supabase** (`@supabase/supabase-js` v2) — database, auth, storage
- **browser-image-compression** — client-side image compression before upload
- **qrcode** — QR generation (PNG via canvas, SVG via string output)
- Deploy target: **Netlify** (SPA)

---

## 1. Local development

```bash
# 1. Install dependencies
npm install

# 2. Create your env file and fill in your Supabase values
cp .env.example .env
#   VITE_SUPABASE_URL=...
#   VITE_SUPABASE_ANON_KEY=...

# 3. Run
npm run dev          # http://localhost:5173

# Production build (what Netlify runs)
npm run build
npm run preview      # serve the built dist/ locally
```

> The **anon key is safe to ship** in the frontend. Row Level Security (see
> `supabase/schema.sql`) is what protects your data. **Never** put the
> `service_role` key in this project.

---

## 2. Supabase setup (do this once)

### 2.1 Create the project

1. Create a free project at [supabase.com](https://supabase.com).
2. Copy **Project URL** and the **anon public key** from
   **Project Settings → API** into your `.env`.

### 2.2 Run the schema

Open **SQL Editor**, paste the contents of [`supabase/schema.sql`](supabase/schema.sql),
and run it. This creates the `products`, `product_images`, and `feedback` tables,
enables Row Level Security, and adds all the table + storage policies.

> The storage policies at the bottom of `schema.sql` reference the
> `product-images` bucket. Create the bucket first (next step), then re-run just
> that storage block if it errored the first time.

### 2.3 Create the storage bucket

**Storage → New bucket** → name it **exactly** `product-images` → set it
**Public** → create.

### 2.4 Storage policies

These are included at the bottom of `schema.sql`, but here they are again for
reference (public read, authenticated write/update/delete on `storage.objects`):

```sql
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
```

### 2.5 Create the single owner user

**Authentication → Users → Add user** → enter the owner's email + a strong
password. This is the **only** login that will ever exist (there is no signup
flow in the app).

### 2.6 Auth redirect URLs

**Authentication → URL Configuration** → add your URLs to **Site URL** and
**Redirect URLs**:

- `http://localhost:5173` (local dev)
- `https://yourapp.netlify.app` (and any custom domain you add later)

---

## 3. Deploy to Netlify

1. Push this repo to GitHub (a free private repo is fine).
2. Netlify → **New site → import from GitHub**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
4. **Site settings → Environment variables** → add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy. `public/_redirects` (`/*  /index.html  200`) ships with the build so
   deep links like `/p/<id>` survive a hard refresh.
6. Add the live URL to Supabase Auth redirect URLs (step 2.6).

### (Optional) Keep Supabase awake

Free Supabase projects pause after ~7 days of inactivity. Point a free
[UptimeRobot](https://uptimerobot.com) monitor (or a scheduled GitHub Action) at
a public product page every few days so it never sleeps.

---

## 4. Routes

| Route               | Access     | Purpose                                            |
| ------------------- | ---------- | -------------------------------------------------- |
| `/`                 | —          | Redirects to `/dashboard` (if logged in) or `/login` |
| `/login`            | public     | Email + password sign-in (no signup)               |
| `/dashboard`        | protected  | Product list, QR previews, edit/delete             |
| `/product/new`      | protected  | Create a product                                   |
| `/product/:id/edit` | protected  | Edit a product                                     |
| `/p/:id`            | public     | Beautiful public product page + feedback           |
| `*`                 | —          | 404                                                |

---

## 5. Project structure

```
src/
  lib/supabase.js          # creates and exports the supabase client
  components/              # ProtectedRoute, ImageUploader, QRCard, StarRating, Gallery
  pages/                   # Login, Dashboard, ProductForm, PublicProduct, NotFound
  App.jsx                  # router
  main.jsx
public/_redirects          # /*  /index.html  200   (SPA fallback for Netlify)
public/favicon.svg
supabase/schema.sql
.env.example
README.md
```

---

## 6. How image upload works

1. On file select each image is compressed in the browser with
   `browser-image-compression` (~0.4 MB max, max dimension ~1600px).
2. Each compressed file is uploaded to the `product-images` bucket at
   `${productId}/${uuid}.${ext}`.
3. The public URL is read with `getPublicUrl(path)` **after** upload completes.
4. A `product_images` row is inserted with `product_id`, `image_url`, `sort_order`.
5. Uploads run in parallel with per-file spinners; one failure doesn't lose the rest.

On delete, the DB cascade removes `product_images` rows, and the app
**explicitly** deletes the storage objects too (cascades don't touch storage).
