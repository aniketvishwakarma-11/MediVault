export interface FAQItemData {
  id: string;
  question: string;
  answer: string;
  snippetAnswer?: string;
  category: "security" | "clinical" | "emergency" | "blockchain" | "general";
}

export const FAQS: FAQItemData[] = [
  {
    id: "data-protection",
    question: "How does MediVault protect my sensitive medical data?",
    answer:
      "MediVault uses end-to-end client-side encryption (AES-GCM-256). Your medical files are encrypted in your browser before being transmitted to private object storage vaults. Only you and explicitly authorized doctors hold the decryption keys. MediVault never stores unauthenticated plaintext clinical records, adhering to Section 12 of the Digital Personal Data Protection Act (DPDPA 2023) and HIPAA security standards.",
    snippetAnswer:
      "MediVault protects medical data using client-side AES-GCM-256 encryption, zero-knowledge private vaults, and DPDPA 2023 compliance. Files are encrypted in the browser before upload, ensuring only patients and explicitly authorized doctors can view them.",
    category: "security",
  },
  {
    id: "blockchain-necessity",
    question: "Why does healthcare data need blockchain technology?",
    answer:
      "Traditional hospital databases can be edited, deleted, or retroactively altered during malpractice lawsuits or insurance disputes. With MediVault, every medical document's cryptographic SHA-256 hash is anchored onto the Polygon blockchain. Once notarized, the record is mathematically tamper-proof—neither hospital staff nor MediVault can ever alter or backdate it.",
    snippetAnswer:
      "Blockchain anchors cryptographic SHA-256 hashes of medical records to Polygon smart contracts. This makes clinical records mathematically tamper-proof, preventing unauthorized deletion or backdating during insurance claims and legal audits.",
    category: "blockchain",
  },
  {
    id: "web3-wallet-gas",
    question: "Do I need cryptocurrency, gas fees, or a MetaMask wallet to use MediVault?",
    answer:
      "No. MediVault is built with a Gasless Web3 Architecture. All on-chain notarizations and state anchors on the Polygon blockchain are sponsored and computed automatically in the background. You get all the cryptographic security of Web3 without needing crypto tokens, gas fees, or browser extensions.",
    snippetAnswer:
      "No crypto or MetaMask wallet is needed. MediVault uses a gasless architecture where all blockchain verification transactions on Polygon are sponsored and processed automatically in the background.",
    category: "blockchain",
  },
  {
    id: "emergency-pass",
    question: "How does the Emergency Medical Pass work during trauma situations?",
    answer:
      "Patients generate an offline-compatible physical and digital Emergency Pass with a standard medical QR code. In an emergency, first responders scan the pass to perform a statutory 'Break-Glass' override, revealing only golden-hour critical data (blood group, critical allergies, chronic conditions, and emergency ICE contacts). The access session is time-limited and logged to a tamper-evident audit trail that notifies the patient's emergency contacts.",
    snippetAnswer:
      "During an emergency, first responders scan the patient's Emergency QR pass to view vital blood type, critical allergies, and ICE contacts without unlocking the phone. The break-glass override is time-limited and logged to an immutable audit trail.",
    category: "emergency",
  },
  {
    id: "ai-copilot-ocr",
    question: "How does the AI Clinical Copilot extract and verify data from handwritten prescriptions?",
    answer:
      "When you upload paper prescriptions or lab reports, MediVault's multimodal AI engine—combining Google Gemini 1.5, NVIDIA NIM, and specialized TrOCR vision neural networks—extracts drug names, dosages, and dosing frequencies. Every extracted metric is cross-referenced against the RxNorm and WHO Essential Medicines catalog, verified with confidence scoring, and linked directly to the original source document.",
    snippetAnswer:
      "MediVault combines Google Gemini 1.5, NVIDIA NIM, and TrOCR neural networks to transcribe handwritten prescriptions. It resolves clinical entities, matches dosages against RxNorm drug catalogs, and flags drug interactions in real time.",
    category: "clinical",
  },
  {
    id: "doctor-access-consent",
    question: "Can doctors access my records without my explicit permission?",
    answer:
      "No. Doctors cannot browse your records at will. When you visit a clinic or hospital, you grant a time-bound consent grant (e.g., 15 minutes, 24 hours, or 30 days) with a specific clinical purpose. When the timer expires, the cryptographic access token invalidates instantly with an immutable audit log. Only verified emergency room physicians can initiate break-glass trauma overrides.",
    snippetAnswer:
      "Doctors cannot access patient records without explicit permission. Patients issue time-bound consent grants (24 hours to 30 days) that expire automatically. Every access event is recorded in a tamper-evident audit log.",
    category: "security",
  },
  {
    id: "government-abha-aadhaar",
    question: "Is linking an Aadhaar or ABHA ID compulsory to use MediVault?",
    answer:
      "No, government ID integration is 100% voluntary. You can use MediVault as a standalone private health locker without providing Aadhaar or ABHA. However, linking an Ayushman Bharat Health Account (ABHA) ID allows you to fetch official lab reports from AIIMS, Apollo, Max, and sync your Ayushman PM-JAY card in one click.",
    snippetAnswer:
      "Linking an ABHA or Aadhaar ID is completely voluntary. Patients can use MediVault as a private health vault, or link ABHA to automatically fetch clinical reports from connected hospitals across India's ABDM network.",
    category: "general",
  },
  {
    id: "pricing-patient",
    question: "Is MediVault free to use for individual patients?",
    answer:
      "Yes. Individual patient accounts with unlimited cloud storage, ABHA health card issuance, DigiLocker sync, AI prescription explanations, and the emergency trauma pass are completely free.",
    snippetAnswer:
      "Yes, MediVault is completely free for individual patients, including document storage, AI prescription scanning, ABHA health card integration, and emergency QR pass generation.",
    category: "general",
  },
  {
    id: "insurance-employer-privacy",
    question: "Can insurance companies or employers see my health records?",
    answer:
      "Never. MediVault operates on zero-knowledge encryption and patient data sovereignty principles. No third party—including insurance firms, employers, or even MediVault system administrators—can view your medical documents without your explicit, time-bound consent.",
    snippetAnswer:
      "No insurance companies, employers, or administrators can see health records. Patient data is encrypted with zero-knowledge keys, meaning only the patient can authorize temporary access.",
    category: "security",
  },
  {
    id: "account-recovery",
    question: "What happens if I lose access to my account?",
    answer:
      "Your records are secured by your verified credentials, biometric WebAuthn passkeys (FaceID, TouchID, Windows Hello), and cryptographic recovery protocols, ensuring you can regain access securely at any time while preventing unauthorized account takeover.",
    snippetAnswer:
      "Accounts are protected by biometric WebAuthn passkeys and cryptographic recovery protocols, allowing patients to regain secure access anytime while defending against credential theft.",
    category: "security",
  },
];
