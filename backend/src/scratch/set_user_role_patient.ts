import { query } from '../config/db';

async function setRoleToPatient() {
  const userId = 'e9aa7d47-fae5-422e-885e-1b3ca24b376a';
  const email = 'aniketvis675@gmail.com';

  console.log(`Setting role to 'patient' for ${email} (${userId})...`);

  const updateRes = await query(
    `UPDATE public.users_profile SET role = 'patient', updated_at = NOW() WHERE id = $1 RETURNING *`,
    [userId]
  );
  console.log('Updated users_profile:', JSON.stringify(updateRes.rows, null, 2));

  process.exit(0);
}

setRoleToPatient();
