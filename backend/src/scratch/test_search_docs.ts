import { DocumentService } from '../services/document.service';

async function testSearchDocs() {
  const patientId = 'aa15ef2b-e4d8-406f-8d99-98d277c425f0';
  console.log('Testing searchDocuments for patientId:', patientId);
  const result = await DocumentService.searchDocuments({
    patient_id: patientId,
    page: 1,
    limit: 10,
  });
  console.log('Result:', JSON.stringify(result, null, 2));
  process.exit(0);
}

testSearchDocs();
