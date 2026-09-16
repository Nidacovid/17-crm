// SOLO SERVIDOR: este fichero usa SUPABASE_SERVICE_ROLE_KEY, que ignora la RLS.
// Jamás importarlo desde un componente de cliente ni exponerlo en NEXT_PUBLIC_* (regla 2.1.4).
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
