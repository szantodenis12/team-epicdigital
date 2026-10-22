import "server-only";
import { createClient } from "@supabase/supabase-js";

// Ocolește RLS. Doar în cod de server, după ce am verificat că apelantul e admin.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
