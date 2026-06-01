import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL. Add it to your .env.local file at the project root."
  )
}

if (!supabaseAnonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY. Add it to your .env.local file at the project root."
  )
}

/**
 * Browser-safe Supabase client (anon / publishable key).
 * Use in Client Components, hooks, and other client-side code.
 * Respects Row Level Security — safe to expose in the browser.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
