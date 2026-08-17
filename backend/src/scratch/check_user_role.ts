import { query } from '../config/db';

async function checkUser() {
  const email = 'aniketvis675@gmail.com';
  console.log('--- Checking User in DB for email:', email);

  try {
    const authUserRes = await query(
      `SELECT id, email, raw_user_meta_data, raw_app_meta_data, role, created_at, updated_at FROM auth.users WHERE email ILIKE $1`,
      [email]
    );
    console.log('auth.users:', JSON.stringify(authUserRes.rows, null, 2));

    const patientRes = await query(
      `SELECT * FROM public.patients WHERE email ILIKE $1 OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE $1)`,
      [email]
    );
    console.log('public.patients:', JSON.stringify(patientRes.rows, null, 2));

    const doctorRes = await query(
      `SELECT * FROM public.doctors WHERE email ILIKE $1 OR user_id IN (SELECT id FROM auth.users WHERE email ILIKE $1)`,
      [email]
    );
    console.log('public.doctors:', JSON.stringify(doctorRes.rows, null, 2));

    const allDoctorsRes = await query(
      `SELECT id, user_id, full_name, email, verification_status FROM public.doctors LIMIT 10`
    );
    console.log('All public.doctors:', JSON.stringify(allDoctorsRes.rows, null, 2));
  } catch (err) {
    console.error('Error checking user:', err);
  }

  process.exit(0);
}

checkUser();
