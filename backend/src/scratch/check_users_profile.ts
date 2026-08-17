import { query } from '../config/db';

async function checkUserProfile() {
  const userId = 'e9aa7d47-fae5-422e-885e-1b3ca24b376a';

  console.log('--- Checking users_profile for userId:', userId);
  const res = await query(`SELECT * FROM public.users_profile WHERE id = $1`, [userId]).catch(e => ({ rows: [] as any[] }));
  console.log('users_profile:', JSON.stringify(res.rows, null, 2));

  process.exit(0);
}

checkUserProfile();
