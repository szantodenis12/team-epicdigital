// Creează primul admin (o singură dată, după migrare).
// Rulare: node --env-file=.env.local scripts/create-admin.mjs email@exemplu.ro "Nume Prenume" 'parola-temporara'
import { createClient } from "@supabase/supabase-js";

const [email, fullName = "", password] = process.argv.slice(2);
if (!email || !password) {
  console.error('Folosire: node --env-file=.env.local scripts/create-admin.mjs <email> "<nume>" <parolă>');
  process.exit(1);
}

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { error: invErr } = await admin.from("invites").upsert({ email: email.toLowerCase(), full_name: fullName, role: "admin" });
if (invErr) throw invErr;

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
if (error) throw error;
console.log(`Admin creat: ${data.user.email} (${data.user.id})`);
