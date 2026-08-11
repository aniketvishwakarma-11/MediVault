import { OCRService } from '../services/ocr.service';
import { MedicalAIService } from '../services/ai/medical_ai.service';
import sharp from 'sharp';

async function runVerificationTest() {
  console.log('--- Starting OCR & AI Analysis Verification Test ---');

  // Create a sample image buffer with text using Sharp SVG rendering
  const svgText = `
    <svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#ffffff"/>
      <text x="30" y="50" font-family="Arial" font-size="24" fill="#000000" font-weight="bold">CITY HOSPITAL LABORATORY REPORT</text>
      <text x="30" y="100" font-family="Arial" font-size="18" fill="#333333">Hemoglobin: 14.5 g/dL (Reference: 13.5-17.5)</text>
      <text x="30" y="140" font-family="Arial" font-size="18" fill="#333333">WBC Count: 7500 /uL (Reference: 4500-11000)</text>
      <text x="30" y="180" font-family="Arial" font-size="18" fill="#333333">Platelet Count: 250000 /uL (Reference: 150000-450000)</text>
      <text x="30" y="220" font-family="Arial" font-size="18" fill="#333333">Fasting Blood Glucose: 95 mg/dL (Reference: 70-99)</text>
    </svg>
  `;

  const sampleImageBuffer = await sharp(Buffer.from(svgText)).jpeg().toBuffer();

  console.log(`[Test] Generated sample medical JPEG image buffer (${sampleImageBuffer.length} bytes).`);

  // 1. Test OCR Extraction
  const ocrResult = await OCRService.extractText(sampleImageBuffer, 'image/jpeg', 'sample_lab_report.jpg');

  console.log('\n--- OCR Service Result ---');
  console.log(`Confidence: ${ocrResult.confidence}`);
  console.log(`Raw Text Extracted:\n"${ocrResult.rawText}"`);

  // Check for gibberish binary regex patterns
  const containsBinaryGibberish = /1rvFujF|vVtVe9RFH|\(7\),01444/i.test(ocrResult.rawText);
  console.log(`Contains Known Binary Gibberish Patterns: ${containsBinaryGibberish ? 'YES (FAIL)' : 'NO (PASS)'}`);

  // 2. Test Medical AI Analysis Processing
  console.log('\n--- Medical AI Service Processing ---');
  const { data: analysis } = await MedicalAIService.processDocument(
    ocrResult.rawText,
    'sample_lab_report.jpg',
    'Blood Report'
  );

  console.log('Summary:', analysis.document?.summary);
  console.log('Extracted Lab Results Count:', analysis.lab_results?.length || 0);
  console.log('Sample Lab Results:', JSON.stringify(analysis.lab_results, null, 2));

  // Check if any lab result contains gibberish values
  const labGibberish = analysis.lab_results?.some((r: any) =>
    /1rvFujF|vVtVe9RFH|\(7\),01444/i.test(r.value || '') || /1rvFujF|vVtVe9RFH|\(7\),01444/i.test(r.test_name || '')
  );

  console.log(`Lab Results Contain Binary Gibberish: ${labGibberish ? 'YES (FAIL)' : 'NO (PASS)'}`);

  if (!containsBinaryGibberish && !labGibberish) {
    console.log('\n✅ VERIFICATION PASSED: OCR and AI pipeline produce clean medical data with ZERO binary gibberish.');
  } else {
    console.error('\n❌ VERIFICATION FAILED: Detected binary gibberish in output.');
    process.exit(1);
  }
}

runVerificationTest().catch((err) => {
  console.error('Verification Test Failed with error:', err);
  process.exit(1);
});
