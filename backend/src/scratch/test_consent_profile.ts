import { ConsentService } from '../services/consent.service';

async function test() {
  const doctorUserId = 'c46d4532-6613-4094-beed-244385394830';
  const patientId = 'aa15ef2b-e4d8-406f-8d99-98d277c425f0';

  const profile = await ConsentService.getMinimalProfile(doctorUserId, patientId);
  console.log('MINIMAL PROFILE RESULT:', JSON.stringify(profile, null, 2));

  process.exit(0);
}

test();
