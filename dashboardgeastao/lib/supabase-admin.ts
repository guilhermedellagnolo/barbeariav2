import { createClient } from "@supabase/supabase-js"

// Cliente Supabase com service_role key — APENAS para uso server-side (API routes).
// Bypassa RLS completamente. NUNCA expor no client.
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.")
  }

  return createClient(url, key)
}
