import { DoctorService } from '../services/doctor.service';

async function testDoctorRealData() {
  console.log('=== Verifying Real Doctor Data Services ===\n');

  const testDoctorId = 'f91d1294-3139-4caa-b41e-90beb987e88a';

  // 1. Dashboard Stats
  const stats = await DoctorService.getDashboardStats(testDoctorId);
  console.log('1. LIVE DASHBOARD STATS:');
  console.log(JSON.stringify(stats, null, 2));

  // 2. Patients Directory
  const patients = await DoctorService.getPatientsDirectory(testDoctorId);
  console.log('\n2. PATIENT DIRECTORY (Count=' + patients.length + '):');
  console.log(JSON.stringify(patients.map(p => ({
    uhid: p.uhid,
    fullName: p.fullName,
    age: p.age,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    recentDiagnosis: p.recentDiagnosis,
    riskBadge: p.riskBadge,
    documentsCount: p.documentsCount
  })), null, 2));

  // 3. Patient Details
  if (patients.length > 0) {
    const firstPatientId = patients[0].id;
    const details = await DoctorService.getPatientDetails(firstPatientId, testDoctorId);
    console.log('\n3. FIRST PATIENT DETAILS:');
    console.log(JSON.stringify(details, null, 2));

    // 4. Patient Documents for Aniket Vishwakarma
    const aniketPatientId = 'aa15ef2b-e4d8-406f-8d99-98d277c425f0';
    const docs = await DoctorService.getPatientDocuments(aniketPatientId);
    console.log('\n4. PATIENT DOCUMENTS FOR ANIKET (Count=' + docs.length + '):');
    console.log(JSON.stringify(docs.map(d => ({
      id: d.id,
      title: d.documentName,
      category: d.documentCategory,
      healthStatus: d.healthStatus,
      doctor: d.doctorName,
      hospital: d.hospitalName,
      hasSignedUrl: Boolean(d.signedDownloadUrl)
    })), null, 2));
  }

  process.exit(0);
}

testDoctorRealData();
