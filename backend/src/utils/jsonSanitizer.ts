import { logger } from './logger';

/**
 * Automatically repairs truncated JSON strings (e.g. cut off by max_tokens limits)
 * by balancing unclosed string quotes, square brackets, and curly braces.
 */
function autoCloseJson(jsonStr: string): string {
  let str = jsonStr.trim();
  // Strip trailing incomplete key/value commas or colons
  str = str.replace(/,\s*$/, '').replace(/:\s*$/, '');

  let inQuote = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '\\' && !escaped) {
      escaped = true;
      continue;
    }
    if (char === '"' && !escaped) {
      inQuote = !inQuote;
    }
    if (!inQuote) {
      if (char === '{' || char === '[') {
        stack.push(char);
      } else if (char === '}') {
        if (stack[stack.length - 1] === '{') stack.pop();
      } else if (char === ']') {
        if (stack[stack.length - 1] === '[') stack.pop();
      }
    }
    escaped = false;
  }

  // If quote was left unclosed, close it
  if (inQuote) {
    str += '"';
  }

  // Strip trailing comma after quote closure
  str = str.replace(/,\s*$/, '');

  // Balance remaining open brackets/braces in reverse
  while (stack.length > 0) {
    const openChar = stack.pop();
    if (openChar === '{') str += '}';
    else if (openChar === '[') str += ']';
  }

  return str;
}

/**
 * Robust JSON extraction & repair utility for LLM response strings.
 * Handles Markdown code blocks, unescaped newlines, trailing commas, and unclosed truncated JSON.
 */
export function cleanAndParseJson<T = any>(rawInput: string): T {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Empty or non-string LLM response payload.');
  }

  // 1. Strip Markdown Code Blocks
  let cleaned = rawInput.trim();
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1].split('```')[0].trim();
  }

  // 2. Extract first '{' to last '}' if valid
  const startIdx = cleaned.indexOf('{');
  const endIdx = cleaned.lastIndexOf('}');
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    cleaned = cleaned.substring(startIdx, endIdx + 1);
  } else if (startIdx !== -1) {
    cleaned = cleaned.substring(startIdx);
  }

  // 3. Attempt 1: Direct JSON.parse
  try {
    return JSON.parse(cleaned);
  } catch (firstErr: any) {
    logger.warn(`[JSON Repair] Initial JSON.parse failed (${firstErr.message}). Attempting automatic sanitization...`);

    // 4. Attempt 2: Fix unescaped newlines inside JSON string values
    let repaired = cleaned.replace(/(\r\n|\n|\r)/g, ' ');

    // 5. Attempt 3: Remove trailing commas before closing braces/brackets
    repaired = repaired.replace(/,\s*([}\]])/g, '$1');

    // 6. Attempt 4: Clean double commas
    repaired = repaired.replace(/,\s*,/g, ',');

    try {
      return JSON.parse(repaired);
    } catch (secondErr: any) {
      logger.warn(`[JSON Repair] Second JSON.parse failed (${secondErr.message}). Attempting auto-closing truncated JSON...`);

      try {
        // Attempt 5: Auto-close truncated string quotes and brackets
        const autoClosed = autoCloseJson(repaired);
        return JSON.parse(autoClosed);
      } catch (thirdErr: any) {
        logger.error(`[JSON Repair Fatal] All JSON repair attempts failed. Raw response head: ${cleaned.slice(0, 300)}`);
        throw new SyntaxError(`LLM returned invalid JSON structure: ${firstErr.message}`);
      }
    }
  }
}

/**
 * Generates an informative, human-readable clinical document title from AI analysis findings
 * instead of displaying generic raw filenames (like hpkp0090.pdf).
 */
export function generateSmartDocumentTitle(
  aiAnalysis?: any,
  originalFilename?: string,
  categoryHint?: string
): string {
  if (!aiAnalysis) {
    if (originalFilename && !originalFilename.match(/^hpkp\d+\.pdf$/i) && !originalFilename.match(/^document\d*\.pdf$/i)) {
      return originalFilename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    }
    return categoryHint || 'Medical Report';
  }

  // 1. If AI produced a specific high-quality suggested title, use it
  const suggested = aiAnalysis.document?.suggested_title;
  if (
    suggested &&
    typeof suggested === 'string' &&
    suggested.trim().length > 3 &&
    !suggested.toLowerCase().includes('placeholder') &&
    !suggested.toLowerCase().includes('.pdf')
  ) {
    return suggested.trim();
  }

  // 2. Synthesize a smart clinical title from extracted clinical entities
  const docType = aiAnalysis.document?.document_type || categoryHint || 'Clinical Report';
  const doctor = aiAnalysis.doctor?.name;
  const hospital = aiAnalysis.hospital?.name;
  const primaryDiagnosis = Array.isArray(aiAnalysis.diagnosis) ? aiAnalysis.diagnosis[0] : null;
  const visitDate = aiAnalysis.visit?.visit_date;

  if (primaryDiagnosis && doctor) {
    return `${docType} — ${primaryDiagnosis} (${doctor})`;
  }
  if (primaryDiagnosis && hospital) {
    return `${docType} — ${primaryDiagnosis} (${hospital})`;
  }
  if (primaryDiagnosis) {
    return `${docType} — ${primaryDiagnosis}`;
  }
  if (doctor) {
    return `${docType} — ${doctor}`;
  }
  if (hospital) {
    return `${docType} — ${hospital}`;
  }
  if (visitDate) {
    return `${docType} (${visitDate})`;
  }

  return `${docType} — Medical Record`;
}

