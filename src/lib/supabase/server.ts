import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in your environment.");
}

let cachedServerClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseServer() {
  if (!cachedServerClient) {
    cachedServerClient = createClient<any, any, any>(
      supabaseUrl || "https://placeholder-project.supabase.co",
      supabaseServiceKey || "placeholder-key",
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }
  return cachedServerClient;
}
