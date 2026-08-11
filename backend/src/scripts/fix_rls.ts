import { db } from '../config/db';

/**
 * Programmatically applies production-grade Supabase RLS policies across MediVault PostgreSQL tables.
 */
async function fixRLSPolicies() {
  console.log('\n==================================================');
  console.log('🔒 Applying Production Row Level Security (RLS)');
  console.log('==================================================\n');

  try {
    // 1. Profiles RLS
    await db.query(`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Public read profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Public insert profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Public update profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Self insert profiles" ON public.profiles;`);
    await db.query(`DROP POLICY IF EXISTS "Self update profiles" ON public.profiles;`);

    await db.query(`CREATE POLICY "Authenticated read profiles" ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');`);
    await db.query(`CREATE POLICY "Self insert profiles" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);`);
    await db.query(`CREATE POLICY "Self update profiles" ON public.profiles FOR UPDATE USING (auth.uid() = id);`);
    console.log('  ✓ Profiles RLS policies hardened.');

    // 2. Patients RLS
    await db.query(`ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Public read patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Public insert patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Public update patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Self or consented read patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Self insert patients" ON public.patients;`);
    await db.query(`DROP POLICY IF EXISTS "Self update patients" ON public.patients;`);

    await db.query(`
      CREATE POLICY "Self or consented read patients" ON public.patients FOR SELECT USING (
        user_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.consent_requests cr 
          WHERE cr.patient_id = public.patients.id AND cr.requested_by = auth.uid() 
          AND cr.status = 'APPROVED' AND (cr.expires_at IS NULL OR cr.expires_at > NOW())
        )
      );
    `);
    await db.query(`CREATE POLICY "Self insert patients" ON public.patients FOR INSERT WITH CHECK (user_id = auth.uid());`);
    await db.query(`CREATE POLICY "Self update patients" ON public.patients FOR UPDATE USING (user_id = auth.uid());`);
    console.log('  ✓ Patients RLS policies hardened.');

    // 3. Doctors RLS
    await db.query(`ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Public read doctors" ON public.doctors;`);
    await db.query(`DROP POLICY IF EXISTS "Self update doctors" ON public.doctors;`);
    await db.query(`CREATE POLICY "Public read doctors" ON public.doctors FOR SELECT USING (true);`);
    await db.query(`CREATE POLICY "Self update doctors" ON public.doctors FOR UPDATE USING (user_id = auth.uid());`);
    console.log('  ✓ Doctors RLS policies hardened.');

    // 4. Medical Reports RLS
    await db.query(`ALTER TABLE public.medical_reports ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Owner or consented read medical_reports" ON public.medical_reports;`);
    await db.query(`DROP POLICY IF EXISTS "Owner insert medical_reports" ON public.medical_reports;`);
    await db.query(`
      CREATE POLICY "Owner or consented read medical_reports" ON public.medical_reports FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        uploader_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.consent_requests cr 
          WHERE cr.patient_id = public.medical_reports.patient_id AND cr.requested_by = auth.uid() 
          AND cr.status = 'APPROVED' AND (cr.expires_at IS NULL OR cr.expires_at > NOW())
        )
      );
    `);
    await db.query(`
      CREATE POLICY "Owner insert medical_reports" ON public.medical_reports FOR INSERT WITH CHECK (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR uploader_id = auth.uid()
      );
    `);
    console.log('  ✓ Medical Reports RLS policies hardened.');

    // 5. Prescriptions RLS
    await db.query(`ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Owner or doctor read prescriptions" ON public.prescriptions;`);
    await db.query(`
      CREATE POLICY "Owner or doctor read prescriptions" ON public.prescriptions FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        doctor_id IN (SELECT id FROM public.doctors WHERE user_id = auth.uid())
      );
    `);
    console.log('  ✓ Prescriptions RLS policies hardened.');

    // 6. Consent Requests RLS
    await db.query(`ALTER TABLE public.consent_requests ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Patient or requester read consent_requests" ON public.consent_requests;`);
    await db.query(`
      CREATE POLICY "Patient or requester read consent_requests" ON public.consent_requests FOR SELECT USING (
        patient_id IN (SELECT id FROM public.patients WHERE user_id = auth.uid()) OR
        requested_by = auth.uid()
      );
    `);
    console.log('  ✓ Consent Requests RLS policies hardened.');

    // 7. Audit Logs RLS
    await db.query(`ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;`);
    await db.query(`DROP POLICY IF EXISTS "Self read audit_logs" ON public.audit_logs;`);
    await db.query(`CREATE POLICY "Self read audit_logs" ON public.audit_logs FOR SELECT USING (user_id = auth.uid());`);
    console.log('  ✓ Audit Logs RLS policies hardened.');

    console.log('\n✅ ALL DATABASE RLS POLICIES SUCCESSFULLY APPLIED!\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error applying RLS policies:', err);
    process.exit(1);
  }
}

fixRLSPolicies();
