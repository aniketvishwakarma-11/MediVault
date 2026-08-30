import {
  AppError,
  DatabaseUnavailableError,
  AIProcessingError,
  ResourceNotFoundError,
  ClinicalSafetyError,
  ValidationError,
  UnauthorizedAccessError,
} from '../errors/AppError';
import { toAppError } from '../errors/errorNormalizer';
import fs from 'fs';
import path from 'path';

console.log('====================================================');
console.log('🧪 MediVault Global Error & Clinical Safety Test Suite');
console.log('====================================================\n');

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

// ─── Test 1: AppError Class Hierarchy ───
const dbErr = new DatabaseUnavailableError();
assert(dbErr.statusCode === 503, 'DatabaseUnavailableError sets HTTP 503');
assert(dbErr.category === 'DATABASE', 'DatabaseUnavailableError category is DATABASE');
assert(dbErr.traceId.startsWith('ERR-MED-'), 'DatabaseUnavailableError generates valid traceId');
assert(dbErr.userTitle.length > 0, 'DatabaseUnavailableError includes userTitle');
assert(dbErr.userMessage.length > 0, 'DatabaseUnavailableError includes userMessage');
assert(dbErr.actionHint.length > 0, 'DatabaseUnavailableError includes actionHint');

const aiErr = new AIProcessingError('AI_TIMEOUT', 'Timeout during extraction');
assert(aiErr.statusCode === 502, 'AIProcessingError sets HTTP 502');
assert(aiErr.code === 'AI_TIMEOUT', 'AIProcessingError preserves error code');

const rxNotFound = new ResourceNotFoundError('Prescription', 'RX-FAKE-1234');
assert(rxNotFound.statusCode === 404, 'ResourceNotFoundError sets HTTP 404');
assert(rxNotFound.code === 'PRESCRIPTION_NOT_FOUND', 'ResourceNotFoundError sets formatted code');

const docErr = new ClinicalSafetyError(
  'PRESCRIBING_DOCTOR_NOT_FOUND',
  'Doctor missing',
  'Doctor Authorization Required',
  'Doctor is not verified',
  'Complete verification'
);
assert(docErr.statusCode === 422, 'ClinicalSafetyError sets HTTP 422');
assert(docErr.category === 'CLINICAL_SAFETY', 'ClinicalSafetyError category is CLINICAL_SAFETY');

// ─── Test 2: Error Normalizer Conversion Tests ───
// 2a. Database connection error mapping
const rawConnErr = new Error('connect ECONNREFUSED 127.0.0.1:5432');
(rawConnErr as any).code = 'ECONNREFUSED';
const normalizedConnErr = toAppError(rawConnErr);
assert(normalizedConnErr instanceof DatabaseUnavailableError, 'Normalizer converts ECONNREFUSED to DatabaseUnavailableError');
assert(normalizedConnErr.statusCode === 503, 'Normalizer sets HTTP 503 for ECONNREFUSED');

// 2b. PostgreSQL duplicate constraint 23505
const pgUniqueErr: any = new Error('duplicate key value violates unique constraint');
pgUniqueErr.code = '23505';
pgUniqueErr.constraint = 'prescriptions_qr_code_hash_key';
const normalizedPgUnique = toAppError(pgUniqueErr);
assert(normalizedPgUnique.code === 'RECORD_ALREADY_EXISTS', 'Normalizer maps 23505 to RECORD_ALREADY_EXISTS');
assert(normalizedPgUnique.statusCode === 400, 'Normalizer sets HTTP 400 for duplicate constraint');

// 2c. PostgreSQL foreign key violation 23503
const pgFkErr: any = new Error('insert or update on table violates foreign key constraint');
pgFkErr.code = '23503';
const normalizedFkErr = toAppError(pgFkErr);
assert(normalizedFkErr.code === 'REFERENCED_RECORD_NOT_FOUND', 'Normalizer maps 23503 to REFERENCED_RECORD_NOT_FOUND');

// 2d. Unhandled sensitive runtime exception masking
const sensitiveErr = new Error('FATAL: password authentication failed for user "postgres" on host 10.0.0.1');
const normalizedSensitive = toAppError(sensitiveErr);
assert(normalizedSensitive.statusCode === 500, 'Unhandled error maps to HTTP 500');
assert(!normalizedSensitive.userMessage.includes('password'), 'Normalizer masks sensitive database credentials from userMessage');
assert(!normalizedSensitive.userMessage.includes('10.0.0.1'), 'Normalizer masks internal hostnames from userMessage');
assert(normalizedSensitive.userTitle === 'System Technical Interruption', 'Normalizer provides empathetic system title');

// ─── Test 3: Elimination of Clinical Hazards Verification ───
// 3a. Verify isDummy is removed from emergency.service.ts
const emergencyServicePath = path.join(__dirname, '../services/emergency.service.ts');
const emergencySource = fs.readFileSync(emergencyServicePath, 'utf8');
assert(!emergencySource.includes('DUMMY_LAB_NAMES'), 'emergency.service.ts does NOT contain DUMMY_LAB_NAMES blacklist');
assert(!emergencySource.includes('DUMMY_VALS'), 'emergency.service.ts does NOT contain DUMMY_VALS blacklist');
assert(!emergencySource.includes('const isDummy ='), 'emergency.service.ts does NOT contain isDummy function');

// 3b. Verify generateFallbackAnalysis is removed from ai.service.ts
const aiServicePath = path.join(__dirname, '../services/ai.service.ts');
const aiSource = fs.readFileSync(aiServicePath, 'utf8');
assert(!aiSource.includes('generateFallbackAnalysis'), 'ai.service.ts does NOT contain generateFallbackAnalysis');
assert(!aiSource.includes('Amoxicillin 500mg'), 'ai.service.ts does NOT contain fabricated Amoxicillin');
assert(!aiSource.includes('Paracetamol 650mg'), 'ai.service.ts does NOT contain fabricated Paracetamol');

// 3c. Verify doctor hijacking is removed from prescription.service.ts
const rxServicePath = path.join(__dirname, '../services/prescription.service.ts');
const rxSource = fs.readFileSync(rxServicePath, 'utf8');
assert(!rxSource.includes('SELECT id FROM public.doctors LIMIT 1'), 'prescription.service.ts does NOT hijack random doctors');
assert(rxSource.includes('PRESCRIBING_DOCTOR_NOT_FOUND'), 'prescription.service.ts throws PRESCRIBING_DOCTOR_NOT_FOUND');

// 3d. Verify dummy UUID fallback is removed from copilot.controller.ts and ai.controller.ts
const copilotCtrlPath = path.join(__dirname, '../controllers/copilot.controller.ts');
const copilotSource = fs.readFileSync(copilotCtrlPath, 'utf8');
assert(!copilotSource.includes('a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d'), 'copilot.controller.ts does NOT contain hardcoded dummy UUID');

const aiCtrlPath = path.join(__dirname, '../controllers/ai.controller.ts');
const aiCtrlSource = fs.readFileSync(aiCtrlPath, 'utf8');
assert(!aiCtrlSource.includes('a3b8c9d0-1e2f-4a5b-8c9d-0e1f2a3b4c5d'), 'ai.controller.ts does NOT contain hardcoded dummy UUID');

console.log('\n====================================================');
console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed.`);
console.log('====================================================\n');

if (passedTests !== totalTests) {
  process.exit(1);
}
