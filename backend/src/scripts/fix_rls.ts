import { db } from '../config/db';

async function fixRLSPolicies() {
  console.log('Connecting to database to apply RLS policies...');
  try {
    // Patients RLS policies
    await db.query(`ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Public read patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Public insert patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Public update patients" ON public.patients;`);

    await db.query(`CREATE POLICY "Public read patients" ON public.patients FOR SELECT USING (true);`);
    await db.query(`CREATE POLICY "Public insert patients" ON public.patients FOR INSERT WITH CHECK (true);`);
    await db.query(`CREATE POLICY "Public update patients" ON public.patients FOR UPDATE USING (true) WITH CHECK (true);`);
    console.log('✓ Patients RLS policies successfully updated!');

    // Profiles RLS policies
    await db.query(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;`);

    await db.query(`CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);`);
    await db.query(`CREATE POLICY "Public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);`);
    await db.query(`CREATE POLICY "Public update profiles" ON public.profiles FOR UPDATE USING (true) WITH CHECK (true);`);
    console.log('✓ Profiles RLS policies successfully updated!');

    console.log('ALL RLS POLICIES APPLIED CLEANLY!');
    process.exit(0);
  } catch (err) {
    console.error('Error applying RLS policies:', err);
    process.exit(1);
  }
}

fixRLSPolicies();
