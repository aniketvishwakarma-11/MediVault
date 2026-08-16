import { db } from '../config/db';

async function fixDoctors() {
  const emails = ['anikethe574@gmail.com', 'aniketvis809@gmail.com', 'aniketvis675@gmail.com'];

  for (const email of emails) {
    const authRes = await db.query(
      `SELECT id, raw_user_meta_data FROM auth.users WHERE email = $1`,
      [email]
    );

    if (authRes.rows.length > 0) {
      const user = authRes.rows[0];
      const name = user.raw_user_meta_data?.full_name || user.raw_user_meta_data?.name || 'Dr. Aniket Vishwakarma';
      const licenseNum = `DOC-${user.id.substring(0, 8).toUpperCase()}`;

      // Update or insert into users_profile
      await db.query(
        `INSERT INTO public.users_profile (id, email, full_name, role)
         VALUES ($1, $2, $3, 'doctor')
         ON CONFLICT (id) DO UPDATE SET role = 'doctor', full_name = $3`,
        [user.id, email, name]
      );

      // Update or insert into doctors
      await db.query(
        `INSERT INTO public.doctors (user_id, license_number, specialization, hospital_name, hospital_affiliation, verification_status)
         VALUES ($1, $2, 'General Physician', 'MediVault EMR', 'MediVault EMR', 'VERIFIED')
         ON CONFLICT (user_id) DO UPDATE SET
           verification_status = 'VERIFIED',
           hospital_name = 'MediVault EMR',
           hospital_affiliation = 'MediVault EMR'`,
        [user.id, licenseNum]
      );

      console.log(`[Doctor Fix] Successfully provisioned: ${email} (ID: ${user.id}) as VERIFIED Doctor!`);
    } else {
      console.log(`[Doctor Fix] Auth user not found for: ${email}`);
    }
  }

  process.exit(0);
}

fixDoctors().catch((err) => {
  console.error('[Doctor Fix Error]:', err);
  process.exit(1);
});
