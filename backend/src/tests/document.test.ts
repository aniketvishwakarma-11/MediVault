import { calculateBufferSHA256 } from '../utils/hash';
import { validateMagicBytes } from '../middleware/upload';
import { MinioStorageService } from '../storage/minioStorage';
import { uploadDocumentSchema, searchDocumentsQuerySchema } from '../validators/document.validator';
import { ALLOWED_CATEGORIES } from '../types/document';

console.log('----------------------------------------------------');
console.log('🧪 Running MediVault Document Management Test Suite');
console.log('----------------------------------------------------');

let passedTests = 0;
let totalTests = 0;

const assert = (condition: boolean, testName: string) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${testName}`);
  }
};

// 1. Hash Utility Tests
const sampleBuffer = Buffer.from('MediVault Health Document Content', 'utf-8');
const expectedSHA256 = 'bd7dcfd7e4a174c8eb5d064cf6f0ec50b868eef4b82d499427b37077c5c0a0c6'; // example or computed hash
const computedHash = calculateBufferSHA256(sampleBuffer);
assert(computedHash.length === 64, 'SHA-256 Checksum length must be 64 hexadecimal characters');
assert(calculateBufferSHA256(sampleBuffer) === computedHash, 'Deterministic SHA-256 checksum calculation');

// 2. Storage Key Hierarchy Tests
const patientId = 'a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d';
const docId = 'b4c9d0e1-2f3a-4b5c-9d0e-1f2a3b4c5d6e';
const key = MinioStorageService.getStorageKey(patientId, docId, 'pdf', 'Blood Report');
assert(
  key === 'patients/P-a3b8c9d0/documents/Blood-Report/b4c9d0e1-2f3a-4b5c-9d0e-1f2a3b4c5d6e/original.pdf',
  'Storage key must follow patients/P-{shortId}/documents/{category}/{documentId}/original.ext layout'
);

const metaKey = MinioStorageService.getMetadataKey(patientId, docId, 'Blood Report');
assert(
  metaKey === 'patients/P-a3b8c9d0/documents/Blood-Report/b4c9d0e1-2f3a-4b5c-9d0e-1f2a3b4c5d6e/metadata.json',
  'Metadata storage key must follow metadata.json layout'
);

// 3. Magic Bytes Security Validation Tests
const fakePdfBuffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]); // %PDF-1.4
assert(validateMagicBytes(fakePdfBuffer, 'application/pdf') === true, 'Magic Bytes: Valid PDF header detection');

const fakeExeBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]); // MZ executable signature
assert(validateMagicBytes(fakeExeBuffer, 'application/pdf') === false, 'Magic Bytes: Reject EXE disguised as PDF');

// 4. Zod Validation Tests
const validPayload = {
  patient_id: patientId,
  document_name: 'Blood Test Report',
  document_category: 'Blood Report',
  visit_date: '2026-08-01',
};
const parseRes = uploadDocumentSchema.safeParse(validPayload);
if (!parseRes.success) {
  console.log('Zod Parse Error Details:', parseRes.error);
}
assert(parseRes.success === true, 'Zod Schema: Valid document upload payload passes');

const invalidCategoryPayload = {
  patient_id: patientId,
  document_name: 'Test Document',
  document_category: 'NonExistentCategory',
};
const invalidCategoryParse = uploadDocumentSchema.safeParse(invalidCategoryPayload);
assert(invalidCategoryParse.success === false, 'Zod Schema: Invalid document category rejected');

// 5. Category Taxonomy Tests
assert(ALLOWED_CATEGORIES.includes('Prescription'), 'Category Taxonomy includes Prescription');
assert(ALLOWED_CATEGORIES.includes('MRI'), 'Category Taxonomy includes MRI');
assert(ALLOWED_CATEGORIES.includes('Discharge Summary'), 'Category Taxonomy includes Discharge Summary');

// 6. Blockchain Service Notarization Integration Tests (Phase 11)
import { BlockchainService } from '../services/blockchain.service';

const testHash = computedHash;
BlockchainService.notarizeDocumentHash(testHash, patientId).then((notarizeRes) => {
  assert(notarizeRes.verified === true, 'Blockchain Notarization: Generates verified on-chain notarization proof');
  assert(notarizeRes.txHash.length === 66, 'Blockchain Notarization: Generates valid bytes32 transaction hash');

  BlockchainService.verifyOnChainHash(testHash).then((verifyRes) => {
    assert(verifyRes.isNotarized === true, 'Blockchain Verification: Confirms on-chain notarization state');
    
    console.log('----------------------------------------------------');
    console.log(`📊 Test Summary: ${passedTests}/${totalTests} tests passed.`);
    console.log('----------------------------------------------------');

    if (passedTests !== totalTests) {
      process.exit(1);
    }
  });
});
