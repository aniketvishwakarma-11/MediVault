import { query } from '../config/db';

async function verify() {
  const email = 'aniketvis675@gmail.com';
  const res = await query(
    `SELECT u.id, u.email, p.role as profile_role, pat.id as patient_id, doc.id as doctor_id
     FROM auth.users u
     LEFT JOIN public.users_profile p ON p.id = u.id
     LEFT JOIN public.patients pat ON pat.user_id = u.id
     LEFT JOIN public.doctors doc ON doc.user_id = u.id
     WHERE u.email ILIKE $1`,
    [email]
  );
  console.log('User status:', JSON.stringify(res.rows, null, 2));
  process.exit(0);
}

verify();
