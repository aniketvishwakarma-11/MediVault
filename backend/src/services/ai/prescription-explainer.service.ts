import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger';

export interface PatientMedicationExplanation {
  medicine_name: string;
  dosage: string;
  language: string;
  why_prescribed: string;
  how_it_works_simple: string;
  how_to_take: {
    timing: string;
    food_rule: string;
    administration: string;
  };
  side_effects: {
    common_mild: string[];
    seek_help_if: string[];
  };
  foods_and_habits_to_avoid: string[];
  missed_dose_guidance: string;
  audio_summary_script: string;
}

export class PrescriptionExplainerService {
  /**
   * Generates patient-centered 5-part explanation with multi-language support.
   */
  public static async generatePatientExplanation(
    medicineName: string,
    dosage: string = 'Standard Dose',
    frequency: string = '1-0-1',
    diagnosis: string = 'General Health Condition',
    recentLabs: Array<{ test: string; value: string; unit?: string }> = [],
    language: string = 'English'
  ): Promise<PatientMedicationExplanation> {
    const apiKey = process.env.GEMINI_API_KEY;

    if (apiKey && !apiKey.includes('placeholder')) {
      const modelCandidates = ['gemini-1.5-flash-latest', 'gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `
You are a caring clinical pharmacist explaining a prescribed medication to a patient in warm, plain language.
Ensure explanations are simple, easy to understand, free of medical jargon, and written in ${language}.

Patient Clinical Context:
- Prescribed Drug: ${medicineName} (${dosage}, Schedule: ${frequency})
- Primary Diagnosis: ${diagnosis}
- Relevant Lab Findings: ${JSON.stringify(recentLabs)}
- Target Language: ${language}

Output a STRICT JSON object matching this schema:
{
  "medicine_name": "${medicineName}",
  "dosage": "${dosage}",
  "language": "${language}",
  "why_prescribed": "1-2 sentences directly linking this drug to their diagnosis or lab tests.",
  "how_it_works_simple": "A simple 1-2 sentence real-world analogy of how the medicine works in the body.",
  "how_to_take": {
    "timing": "When to take (e.g. Morning with breakfast, Night before sleep)",
    "food_rule": "Take with food / on empty stomach",
    "administration": "Swallow whole with full glass of water. Do not crush."
  },
  "side_effects": {
    "common_mild": ["Mild nausea in first week", "Dry mouth"],
    "seek_help_if": ["Severe dizziness", "Difficulty breathing or skin rash"]
  },
  "foods_and_habits_to_avoid": ["Limit alcohol consumption", "Avoid grapefruit"],
  "missed_dose_guidance": "Clear advice on what to do if a pill is forgotten.",
  "audio_summary_script": "A 2-3 sentence conversational script that can be read aloud to the patient summarizing their daily routine."
}
`;

      for (const modelName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          });

          const result = await model.generateContent(prompt);
          const text = result.response.text();
          return JSON.parse(text);
        } catch (err: any) {
          logger.warn(`[PrescriptionExplainerService] AI generation notice for ${modelName}:`, err.message || err);
        }
      }
    }

    return this.generateFallbackExplanation(medicineName, dosage, frequency, diagnosis, language);
  }

  private static generateFallbackExplanation(
    medicineName: string,
    dosage: string,
    frequency: string,
    diagnosis: string,
    language: string
  ): PatientMedicationExplanation {
    const isMetformin = medicineName.toLowerCase().includes('metformin');
    const isAtorvastatin = medicineName.toLowerCase().includes('atorva');
    const isAntibiotic = medicineName.toLowerCase().includes('amox') || medicineName.toLowerCase().includes('augmentin');

    if (language === 'Hindi' || language === 'hindi') {
      return {
        medicine_name: medicineName,
        dosage,
        language: 'Hindi',
        why_prescribed: `यह दवा आपके ${diagnosis} के उपचार और लक्षणों को नियंत्रित करने के लिए डॉक्टर द्वारा दी गई है।`,
        how_it_works_simple: 'यह दवा शरीर में आवश्यक रसायनों को संतुलित करके आपके स्वास्थ्य में सुधार करती है।',
        how_to_take: {
          timing: `नियत समय पर लें (${frequency})`,
          food_rule: 'भोजन के बाद पानी के साथ लें।',
          administration: 'गोली को बिना तोड़े पानी के साथ निगलें।',
        },
        side_effects: {
          common_mild: ['हल्की सुस्ती या पेट भारी लगना (शुरुआती दिनों में)'],
          seek_help_if: ['सांस लेने में तकलीफ या गंभीर खुजली'],
        },
        foods_and_habits_to_avoid: ['शराब का सेवन न करें', 'समय पर पर्याप्त पानी पिएं'],
        missed_dose_guidance: 'यदि खुराक भूल जाएं तो याद आते ही लें, लेकिन दो खुराक एक साथ कभी न लें।',
        audio_summary_script: `नमस्ते, कृपया अपनी दवा ${medicineName} डॉक्टर के निर्देशानुसार समय पर भोजन के बाद लें।`,
      };
    }

    return {
      medicine_name: medicineName,
      dosage,
      language: 'English',
      why_prescribed: isMetformin
        ? `Prescribed to regulate your blood sugar and improve metabolic control for ${diagnosis}.`
        : isAtorvastatin
        ? `Prescribed to lower your LDL cholesterol and protect your heart vessels.`
        : isAntibiotic
        ? `Prescribed to eliminate the bacterial infection associated with ${diagnosis}.`
        : `Prescribed by your doctor to manage and support your recovery for ${diagnosis}.`,
      how_it_works_simple: isMetformin
        ? 'Acts like a helper key, allowing your body cells to absorb glucose naturally from your bloodstream.'
        : isAtorvastatin
        ? 'Slows down the production of cholesterol in your liver to keep your arteries clean.'
        : 'Targets and neutralizes harmful bacteria so your immune system can heal.',
      how_to_take: {
        timing: `Follow the ${frequency} schedule regularly.`,
        food_rule: 'Take with or immediately after meals with a full glass of water.',
        administration: 'Swallow whole with water; do not crush or chew sustained-release tablets.',
      },
      side_effects: {
        common_mild: ['Mild stomach fullness or digestive changes in the first few days.'],
        seek_help_if: ['Unusual muscle weakness, sudden rash, or difficulty breathing.'],
      },
      foods_and_habits_to_avoid: ['Avoid excessive alcohol', 'Stay well-hydrated throughout the day.'],
      missed_dose_guidance: 'Take as soon as remembered unless it is almost time for your next scheduled dose. Never take two doses together.',
      audio_summary_script: `Hello! Please take your ${medicineName} as scheduled with meals. Stay hydrated and remember never to double your dose if missed.`,
    };
  }
}
