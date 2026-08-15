import { EmergencyService } from '../services/emergency.service';

async function testEmergencyData() {
  const patientId = 'aa15ef2b-e4d8-406f-8d99-98d277c425f0';
  console.log('Testing EmergencyService for patientId:', patientId);

  const docs = await EmergencyService.getPatientDocuments(patientId);
  console.log('\n--- Documents (' + docs.length + ') ---');
  console.log(JSON.stringify(docs, null, 2));

  const timeline = await EmergencyService.getPatientTimeline(patientId);
  console.log('\n--- Timeline (' + timeline.length + ') ---');
  console.log(JSON.stringify(timeline, null, 2));

  const labs = await EmergencyService.getPatientLabs(patientId);
  console.log('\n--- Labs (' + labs.length + ') ---');
  console.log(JSON.stringify(labs, null, 2));

  process.exit(0);
}

testEmergencyData();
