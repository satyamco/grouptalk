import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn("Warning: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in your environment.");
}

export interface Database {
  public: {
    Tables: {
      [key: string]: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
  };
}

let cachedServerClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseServer(): any {
  if (!cachedServerClient) {
    cachedServerClient = createClient<Database>(
      supabaseUrl || "https://placeholder-project.supabase.co",
      supabaseServiceKey || "placeholder-key",
      {
        auth: {
          persistSession: false,
        },
      }
    );
  }
  return cachedServerClient!;
}
