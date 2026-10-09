import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://plunoacxwgwsjayzwmdl.supabase.co";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_-6EwtyA5ZMDK1XaVkjW21A_r1rMfS_-";

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
