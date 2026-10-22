import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Link din emailul de invitație / resetare → sesiune → setare parolă.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const to = request.nextUrl.clone();
  to.search = "";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      to.pathname = "/cont";
      to.searchParams.set("parola", "1");
      return NextResponse.redirect(to);
    }
  }
  to.pathname = "/login";
  to.searchParams.set("eroare", "link");
  return NextResponse.redirect(to);
}
