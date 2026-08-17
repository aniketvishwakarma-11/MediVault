import { query } from '../config/db';

async function enforceImmutableRoles() {
  console.log('--- Enforcing Immutable Roles in PostgreSQL Database ---');

  // 1. Clean up stray doctor record for aniketvis675@gmail.com if it was auto-created
  const userId = 'e9aa7d47-fae5-422e-885e-1b3ca24b376a';
  const delDoc = await query(`DELETE FROM public.doctors WHERE user_id = $1 AND license_number LIKE 'DOC-%' RETURNING id`, [userId]);
  console.log('Cleaned up stray auto-created doctor records:', delDoc.rows);

  // 2. Ensure users_profile.role is 'patient'
  await query(`UPDATE public.users_profile SET role = 'patient' WHERE id = $1`, [userId]);
  console.log('Ensured role is patient for aniketvis675@gmail.com');

  // 3. Create Trigger Function in PostgreSQL to block any role modification
  const triggerSql = `
    CREATE OR REPLACE FUNCTION public.prevent_role_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      -- If role already exists and someone tries to change it, reject the update
      IF OLD.role IS NOT NULL AND NEW.role IS DISTINCT FROM OLD.role THEN
        RAISE EXCEPTION 'Security Policy Violation: User role is immutable once assigned. Cannot change role from "%" to "%"', OLD.role, NEW.role;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_prevent_role_modification ON public.users_profile;
    CREATE TRIGGER trg_prevent_role_modification
    BEFORE UPDATE ON public.users_profile
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_role_modification();
  `;

  await query(triggerSql);
  console.log('Trigger trg_prevent_role_modification successfully created and active in PostgreSQL.');

  // 4. Test the trigger by attempting to change role to doctor (it should throw an error)
  try {
    await query(`UPDATE public.users_profile SET role = 'doctor' WHERE id = $1`, [userId]);
    console.error('FAILED: Trigger did not block update!');
  } catch (err: any) {
    console.log('SUCCESS: Trigger blocked role modification as expected! Error message:', err.message);
  }

  process.exit(0);
}

enforceImmutableRoles();
