import { createClient } from '@supabase/supabase-js'

// Read from Vite env (must be prefixed with VITE_ to reach the browser).
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Fail loudly during development if the env is missing, rather than throwing a
// cryptic error deep inside the first network call.
if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing Supabase env vars. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

// The anon key is safe to expose in the frontend: Row Level Security (see
// supabase/schema.sql) is what actually protects the data. Never use the
// service_role key here.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Name of the public storage bucket holding product images.
export const PRODUCT_IMAGES_BUCKET = 'product-images'
