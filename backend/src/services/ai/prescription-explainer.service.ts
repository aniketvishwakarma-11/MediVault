import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../../utils/logger';

export interface PatientMedicationExplanation {
  medicine_name: string;
  dosage: string;
  language: string;
  drug_class?: string;
  active_ingredient?: string;
  expected_onset?: string;
  lifestyle_tip?: string;
  storage_info?: string;
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
   * Generates patient-centered rich personalized explanation with multi-language support.
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
      const modelCandidates = ['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
      const genAI = new GoogleGenerativeAI(apiKey);

      const prompt = `
You are an expert, compassionate clinical pharmacist explaining a prescribed medication to a patient in warm, plain language.
Ensure explanations are deeply personalized, practical, scientifically accurate, and written in ${language}.

Patient Clinical Context:
- Prescribed Drug: ${medicineName} (${dosage}, Schedule: ${frequency})
- Primary Diagnosis / Reason: ${diagnosis}
- Relevant Lab Findings: ${JSON.stringify(recentLabs)}
- Target Language: ${language}

If the diagnosis is generic (e.g. "External prescription" or "General Health"), intelligently deduce the primary clinical use of this medicine (e.g. pain/fever for paracetamol, blood sugar control for metformin, acidity for pantoprazole, infection for antibiotics).

Output a STRICT JSON object matching this schema:
{
  "medicine_name": "${medicineName}",
  "dosage": "${dosage}",
  "language": "${language}",
  "drug_class": "e.g. Analgesic & Antipyretic, Broad-Spectrum Antibiotic, Statin / Lipid Lowering, etc.",
  "active_ingredient": "e.g. Paracetamol / Acetaminophen 500mg, Amoxicillin 500mg, etc.",
  "expected_onset": "e.g. Starts working in 30–45 minutes; peak relief in 1–2 hours.",
  "lifestyle_tip": "A practical, personalized lifestyle/diet tip that accelerates recovery with this medication.",
  "storage_info": "e.g. Store at room temperature (below 25°C) in a dry place away from direct sunlight.",
  "why_prescribed": "2 warm, reassuring sentences directly explaining what condition or symptoms this medicine manages.",
  "how_it_works_simple": "A simple, vivid real-world analogy of how the medicine works in the body.",
  "how_to_take": {
    "timing": "Specific morning/afternoon/night timing based on ${frequency}.",
    "food_rule": "Precise food instruction (e.g. Take 15 mins after a light meal with water).",
    "administration": "Clear instruction (e.g. Swallow whole with a full glass of water. Do not crush)."
  },
  "side_effects": {
    "common_mild": ["2 mild, temporary symptoms the patient should not worry about."],
    "seek_help_if": ["2 critical red-flag warning signs requiring immediate medical care."]
  },
  "foods_and_habits_to_avoid": ["2 specific foods, beverages, or habits to avoid (e.g. alcohol, grapefruit, antacids)."],
  "missed_dose_guidance": "Clear, reassuring advice on what to do if a pill is forgotten.",
  "audio_summary_script": "A 2-3 sentence friendly spoken message that can be read aloud summarizing their daily routine."
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
          const parsed = JSON.parse(text);
          if (parsed && parsed.why_prescribed) return parsed;
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
    const medLower = medicineName.toLowerCase();
    const isTamen = medLower.includes('tamen') || medLower.includes('paracetamol') || medLower.includes('dolo') || medLower.includes('crocin') || medLower.includes('calpol');
    const isMetformin = medLower.includes('metformin') || medLower.includes('glycomet');
    const isAtorvastatin = medLower.includes('atorva') || medLower.includes('statin') || medLower.includes('lipitor');
    const isAntibiotic = medLower.includes('amox') || medLower.includes('augmentin') || medLower.includes('azithro') || medLower.includes('cipro');
    const isAntacid = medLower.includes('panto') || medLower.includes('omepra') || medLower.includes('rabeprazole') || medLower.includes('pan');
    const isPainRelief = medLower.includes('ibuprofen') || medLower.includes('diclofenac') || medLower.includes('aceclo');

    if (language === 'Hindi' || language === 'hindi') {
      if (isTamen) {
        return {
          medicine_name: medicineName,
          dosage,
          language: 'Hindi',
          drug_class: 'एनाल्जेसिक और एंटीपायरेटिक (दर्द व बुखार निवारक)',
          active_ingredient: 'पैरासिटामोल / एसिटामिनोफेन',
          expected_onset: '30 से 45 मिनट में असर शुरू, 1-2 घंटे में अधिकतम राहत',
          lifestyle_tip: 'दिनभर में 2-3 लीटर पानी पिएं और पर्याप्त आराम करें। शराब से पूरी तरह परहेज रखें।',
          storage_info: '25°C से कम तापमान पर, सूखी जगह में सीधी धूप से बचाकर रखें।',
          why_prescribed: 'यह दवा सिरदर्द, बदन दर्द, बुखार और शारीरिक असहजता से तुरंत राहत देने के लिए निर्धारित की गई है।',
          how_it_works_simple: 'यह मस्तिष्क में दर्द के रासायनिक संदेशवाहकों को रोकती है और शरीर के तापमान नियंत्रण केंद्र को सामान्य करती है।',
          how_to_take: {
            timing: `नियत समय पर लें (${frequency})`,
            food_rule: 'भोजन या हल्के नाश्ते के बाद एक गिलास पानी के साथ लें।',
            administration: 'गोली को बिना चबाए या तोड़े पानी के साथ निगलें।',
          },
          side_effects: {
            common_mild: ['हल्की मतली या पेट में हल्का भारीपन (शुरुआती समय में)'],
            seek_help_if: ['त्वचा पर लाल चकत्ते, चेहरे/गले पर सूजन या सांस लेने में तकलीफ'],
          },
          foods_and_habits_to_avoid: ['शराब का सेवन न करें (लिवर सुरक्षा हेतु)', 'अन्य पैरासिटामोल युक्त दवाओं के साथ न लें'],
          missed_dose_guidance: 'याद आते ही लें, लेकिन यदि अगली खुराक का समय हो गया हो तो पिछली छोड़ दें। दो खुराक एक साथ कभी न लें।',
          audio_summary_script: `नमस्ते! कृपया अपनी दवा ${medicineName} भोजन के बाद समय पर लें। दर्द या बुखार में यह 30 मिनट में आराम देना शुरू करेगी।`,
        };
      }

      return {
        medicine_name: medicineName,
        dosage,
        language: 'Hindi',
        drug_class: 'चिकित्सीय आवश्यक दवा',
        active_ingredient: medicineName,
        expected_onset: 'नियमित सेवन से 24-48 घंटों में लक्षणीय सुधार',
        lifestyle_tip: 'दवा के साथ संतुलित पौष्टिक आहार और पर्याप्त जलयोजन बनाए रखें।',
        storage_info: 'कमरे के सामान्य तापमान पर बच्चों की पहुंच से दूर रखें।',
        why_prescribed: `यह दवा आपके स्वास्थ्य में तेजी से सुधार और लक्षणों को नियंत्रित करने के लिए निर्धारित की गई है।`,
        how_it_works_simple: 'यह शरीर के भीतर आवश्यक जैविक रसायनों को संतुलित करके रोग प्रतिरोधक क्षमता का सहयोग करती है।',
        how_to_take: {
          timing: `नियत समय पर लें (${frequency})`,
          food_rule: 'भोजन के बाद पानी के साथ लें।',
          administration: 'गोली को बिना तोड़े पानी के साथ निगलें।',
        },
        side_effects: {
          common_mild: ['हल्की सुस्ती या हल्का पाचन परिवर्तन'],
          seek_help_if: ['सांस लेने में तकलीफ, अत्यधिक चक्कर या गंभीर एलर्जी'],
        },
        foods_and_habits_to_avoid: ['शराब और अत्यधिक तैलीय भोजन से परहेज करें'],
        missed_dose_guidance: 'यदि खुराक भूल जाएं तो याद आते ही लें, लेकिन दो खुराक एक साथ कभी न लें।',
        audio_summary_script: `नमस्ते, कृपया अपनी दवा ${medicineName} डॉक्टर के निर्देशानुसार समय पर भोजन के बाद लें।`,
      };
    }

    // English Deep Personalization
    if (isTamen) {
      return {
        medicine_name: medicineName,
        dosage,
        language: 'English',
        drug_class: 'Analgesic & Antipyretic (Pain & Fever Reliever)',
        active_ingredient: 'Paracetamol / Acetaminophen (with Enhanced Onset Core)',
        expected_onset: 'Begins working within 30–45 minutes; peak relief in 1–2 hours.',
        lifestyle_tip: 'Drink at least 2.5L of water daily and prioritize restful sleep. Avoid alcohol completely while on this therapy to protect your liver enzymes.',
        storage_info: 'Store in a cool, dry place below 25°C away from direct sunlight and humidity.',
        why_prescribed: 'Prescribed for rapid relief from acute headaches, body aches, joint soreness, fever, and generalized inflammatory discomfort.',
        how_it_works_simple: 'Acts like a chemical shield in your nervous system, blocking prostaglandins (pain signals) and gently resetting your brain’s internal thermostat.',
        how_to_take: {
          timing: `Follow the ${frequency} schedule regularly with meals.`,
          food_rule: 'Take 15–20 minutes after a light meal with a full glass of water.',
          administration: 'Swallow tablet whole; do not crush, chew, or dissolve unless instructed.',
        },
        side_effects: {
          common_mild: ['Mild stomach fullness or temporary sleepiness in the first 24 hours.'],
          seek_help_if: ['Sudden skin hives/rash, wheezing, swelling around lips/eyes, or severe nausea.'],
        },
        foods_and_habits_to_avoid: ['Alcohol consumption (increases liver load)', 'Do NOT combine with other Paracetamol/Acetaminophen cough & cold remedies.'],
        missed_dose_guidance: 'Take as soon as remembered unless it is almost time for your next scheduled dose. Never take a double dose to make up for a missed one.',
        audio_summary_script: `Hello! Take your ${medicineName} with water after meals. You should begin feeling relief within 30 to 45 minutes. Remember to stay hydrated and avoid duplicate pain medications.`,
      };
    }

    if (isMetformin) {
      return {
        medicine_name: medicineName,
        dosage,
        language: 'English',
        drug_class: 'Biguanide Antidiabetic',
        active_ingredient: 'Metformin Hydrochloride',
        expected_onset: 'Steady glycemic stabilization over 1–2 weeks of consistent therapy.',
        lifestyle_tip: 'Pair with 30 mins of daily moderate walking and fiber-rich meals to maximize insulin sensitivity.',
        storage_info: 'Store at 20–25°C away from moisture.',
        why_prescribed: 'Prescribed to regulate fasting and post-meal blood sugar levels and optimize your cellular insulin response.',
        how_it_works_simple: 'Acts like a helper key, allowing your muscle cells to absorb sugar naturally from your bloodstream while reducing sugar output from your liver.',
        how_to_take: {
          timing: `Take ${frequency} strictly with your largest meals.`,
          food_rule: 'Take with or immediately after meals to prevent stomach sensitivity.',
          administration: 'Swallow whole with plenty of water. Do not crush sustained-release tablets.',
        },
        side_effects: {
          common_mild: ['Mild bloating or loose stools in the first 1–2 weeks (adapts quickly).'],
          seek_help_if: ['Extreme fatigue, unusual muscle aches, rapid breathing, or severe abdominal pain.'],
        },
        foods_and_habits_to_avoid: ['Sugary soft drinks & refined carbs', 'Excessive alcohol intake.'],
        missed_dose_guidance: 'Take with your next meal if remembered. Never double up on your doses.',
        audio_summary_script: `Hello! Take your ${medicineName} with your main meals to maintain balanced blood sugar throughout your day.`,
      };
    }

    if (isAtorvastatin) {
      return {
        medicine_name: medicineName,
        dosage,
        language: 'English',
        drug_class: 'HMG-CoA Reductase Inhibitor (Statin)',
        active_ingredient: 'Atorvastatin Calcium',
        expected_onset: 'Reduces LDL cholesterol by 35–50% within 4 to 6 weeks of continuous use.',
        lifestyle_tip: 'Incorporate heart-healthy Mediterranean foods like walnuts, flaxseeds, and leafy greens.',
        storage_info: 'Store in original packaging at room temperature away from heat.',
        why_prescribed: 'Prescribed to lower low-density lipoprotein (bad cholesterol) and safeguard your cardiovascular vessels against plaque buildup.',
        how_it_works_simple: 'Calms the cholesterol factory in your liver and cleanses existing bloodstream arteries.',
        how_to_take: {
          timing: 'Best taken once daily in the evening or bedtime.',
          food_rule: 'Can be taken with or without food at the same time each night.',
          administration: 'Swallow whole with water.',
        },
        side_effects: {
          common_mild: ['Mild joint stiffness or temporary headache.'],
          seek_help_if: ['Unexplained muscle tenderness, dark tea-colored urine, or severe yellowing of eyes.'],
        },
        foods_and_habits_to_avoid: ['Grapefruit and grapefruit juice (blocks drug metabolism)', 'Heavy binge drinking.'],
        missed_dose_guidance: 'Take when remembered if within 12 hours. If more than 12 hours have passed, wait for your regular evening dose.',
        audio_summary_script: `Good evening! Remember to take your ${medicineName} before bedtime to keep your heart and blood vessels protected.`,
      };
    }

    return {
      medicine_name: medicineName,
      dosage,
      language: 'English',
      drug_class: 'Targeted Therapeutic Agent',
      active_ingredient: medicineName,
      expected_onset: 'Symptom relief typically initiates within 24 to 48 hours of compliant therapy.',
      lifestyle_tip: 'Maintain regular hydration, a nutrient-rich diet, and adhere to scheduled rest intervals.',
      storage_info: 'Store in a cool, dry place below 25°C away from direct sunlight.',
      why_prescribed: `Prescribed by your physician to target and resolve the clinical symptoms associated with your current care plan.`,
      how_it_works_simple: 'Assists your body by restoring biochemical balance and accelerating natural cellular recovery.',
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

