import { createClient } from "@supabase/supabase-js";
export function getSupabase(url?: string, anonKey?: string) {
  const u = url ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_URL : undefined) ?? process.env.SUPABASE_URL!;
  const k = anonKey ?? (typeof import.meta !== "undefined" ? (import.meta as any).env?.VITE_SUPABASE_ANON_KEY : undefined) ?? process.env.SUPABASE_ANON_KEY!;
  return createClient(u, k);
}
