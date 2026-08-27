import { query } from '../config/db';

async function fixAniketAccount() {
  console.log('=== Repairing Aniket Account in DB ===\n');

  try {
    // 1. Get user profile
    const userRes = await query(
      `SELECT id, email, full_name, role FROM public.users_profile WHERE email ILIKE $1`,
      ['%aniketvis675%']
    );

    if (userRes.rows.length === 0) {
      console.log('User not found!');
      process.exit(1);
    }

    const user = userRes.rows[0];
    console.log('Current user record:', user);

    // 2. Set role back to 'patient' in users_profile
    await query(
      `UPDATE public.users_profile SET role = 'patient' WHERE id = $1`,
      [user.id]
    );
    console.log('Updated users_profile role to patient.');

    // 3. Check / ensure patient record exists
    const patRes = await query(
      `SELECT id FROM public.patients WHERE user_id = $1`,
      [user.id]
    );
    console.log('Patient record:', patRes.rows);

    // 4. Remove conflicting doctor record for this patient user
    await query(
      `DELETE FROM public.doctors WHERE user_id = $1`,
      [user.id]
    );
    console.log('Removed test doctor row for this patient.');

    // 5. Check active emergency credential
    const credRes = await query(
      `SELECT * FROM public.emergency_credentials WHERE patient_id = $1 ORDER BY version DESC`,
      [patRes.rows[0]?.id]
    );
    console.log('Emergency credentials for patient:', credRes.rows);

    console.log('\n=== Repair Complete! ===');
    process.exit(0);
  } catch (err) {
    console.error('Error during repair:', err);
    process.exit(1);
  }
}

fixAniketAccount();
