import { query, isConnectionError } from '../config/db';
import { logger } from '../utils/logger';

export interface DrugCatalogItem {
  id: string;
  rxcui?: string;
  atc_code?: string;
  is_who_essential: boolean;
  brand_name?: string;
  generic_name: string;
  therapeutic_class?: string;
  is_nlem: boolean;
  dosage_form: string;
  strength: string;
  route: string;
  default_schedule: string;
  food_instructions: string;
  allergy_classes: string[];
  jan_aushadhi_price?: number;
  market_brand_price?: number;
  contraindications?: string[];
}

export const FALLBACK_DRUG_CATALOG: DrugCatalogItem[] = [
  {
    id: 'drug-101',
    rxcui: '860975',
    atc_code: 'A10BA02',
    is_who_essential: true,
    brand_name: 'Glycomet 500 / Glucophage',
    generic_name: 'Metformin Hydrochloride',
    therapeutic_class: 'Biguanide Antidiabetic',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '500 mg',
    route: 'Oral',
    default_schedule: '1-0-1',
    food_instructions: 'Take with or immediately after meals',
    allergy_classes: [],
    jan_aushadhi_price: 12.00,
    market_brand_price: 48.00,
    contraindications: ['Severe Renal Impairment (eGFR < 30)', 'Metabolic Acidosis'],
  },
  {
    id: 'drug-102',
    rxcui: '617314',
    atc_code: 'C10AA05',
    is_who_essential: true,
    brand_name: 'Atorva 10 / Lipitor',
    generic_name: 'Atorvastatin Calcium',
    therapeutic_class: 'HMG-CoA Reductase Inhibitor (Statin)',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '10 mg',
    route: 'Oral',
    default_schedule: '0-0-1',
    food_instructions: 'Take at bedtime with water',
    allergy_classes: [],
    jan_aushadhi_price: 15.00,
    market_brand_price: 88.00,
    contraindications: ['Active Liver Disease', 'Pregnancy'],
  },
  {
    id: 'drug-103',
    rxcui: '316672',
    atc_code: 'C09CA07',
    is_who_essential: true,
    brand_name: 'Telma 40 / Micardis',
    generic_name: 'Telmisartan',
    therapeutic_class: 'Angiotensin II Receptor Blocker (ARB)',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '40 mg',
    route: 'Oral',
    default_schedule: '1-0-0',
    food_instructions: 'Take in the morning with water',
    allergy_classes: [],
    jan_aushadhi_price: 14.00,
    market_brand_price: 95.00,
    contraindications: ['Pregnancy (2nd/3rd trimester)', 'Bilateral Renal Artery Stenosis'],
  },
  {
    id: 'drug-104',
    rxcui: '313797',
    atc_code: 'J01CR02',
    is_who_essential: true,
    brand_name: 'Augmentin 625 Duo / Clavam 625',
    generic_name: 'Amoxicillin + Clavulanic Acid',
    therapeutic_class: 'Beta-lactam Antibacterial',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '625 mg',
    route: 'Oral',
    default_schedule: '1-0-1',
    food_instructions: 'Take at the start of a light meal',
    allergy_classes: ['Penicillin', 'Beta-lactam'],
    jan_aushadhi_price: 45.00,
    market_brand_price: 185.00,
    contraindications: ['History of Amoxicillin-associated jaundice', 'Severe Penicillin Allergy'],
  },
  {
    id: 'drug-105',
    rxcui: '860975',
    atc_code: 'N02BE01',
    is_who_essential: true,
    brand_name: 'Dolo 650 / Crocin 650 / Calpol 650',
    generic_name: 'Paracetamol',
    therapeutic_class: 'Analgesic & Antipyretic',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '650 mg',
    route: 'Oral',
    default_schedule: '1-0-1 (PRN)',
    food_instructions: 'Take with water every 6-8 hours as needed (Max 4000mg/day)',
    allergy_classes: [],
    jan_aushadhi_price: 8.00,
    market_brand_price: 34.00,
    contraindications: ['Severe Hepatic Impairment'],
  },
  {
    id: 'drug-106',
    rxcui: '284635',
    atc_code: 'A02BC02',
    is_who_essential: true,
    brand_name: 'Pan 40 / Pantocid 40',
    generic_name: 'Pantoprazole Sodium',
    therapeutic_class: 'Proton Pump Inhibitor (PPI)',
    is_nlem: true,
    dosage_form: 'Tablet (Enteric Coated)',
    strength: '40 mg',
    route: 'Oral',
    default_schedule: '1-0-0',
    food_instructions: 'Take 30 minutes before morning breakfast',
    allergy_classes: [],
    jan_aushadhi_price: 18.00,
    market_brand_price: 115.00,
    contraindications: ['Hypersensitivity to substituted benzimidazoles'],
  },
  {
    id: 'drug-107',
    rxcui: '141962',
    atc_code: 'J01FA10',
    is_who_essential: true,
    brand_name: 'Azithral 500 / Azee 500',
    generic_name: 'Azithromycin',
    therapeutic_class: 'Macrolide Antibiotic',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '500 mg',
    route: 'Oral',
    default_schedule: '1-0-0',
    food_instructions: 'Take 1 hour before or 2 hours after meals for 3-5 days',
    allergy_classes: ['Macrolides'],
    jan_aushadhi_price: 42.00,
    market_brand_price: 130.00,
    contraindications: ['Cholestatic Jaundice', 'QT Prolongation'],
  },
  {
    id: 'drug-108',
    rxcui: '312615',
    atc_code: 'B03AA07',
    is_who_essential: true,
    brand_name: 'Autrin / Fefol / Orofer-XT',
    generic_name: 'Ferrous Ascorbate + Folic Acid',
    therapeutic_class: 'Hematinic (Iron Supplement)',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '100 mg + 1.5 mg',
    route: 'Oral',
    default_schedule: '0-1-0',
    food_instructions: 'Take 1-2 hours after meals with Vitamin C / Citrus juice',
    allergy_classes: [],
    jan_aushadhi_price: 25.00,
    market_brand_price: 155.00,
    contraindications: ['Hemosiderosis', 'Hemochromatosis'],
  },
  {
    id: 'drug-109',
    rxcui: '20352',
    atc_code: 'R06AE07',
    is_who_essential: true,
    brand_name: 'Cetzine 10 / Zyrtec',
    generic_name: 'Cetirizine Hydrochloride',
    therapeutic_class: 'Second-Generation Antihistamine',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '10 mg',
    route: 'Oral',
    default_schedule: '0-0-1',
    food_instructions: 'Take once daily at bedtime',
    allergy_classes: [],
    jan_aushadhi_price: 7.00,
    market_brand_price: 38.00,
    contraindications: ['End-stage Renal Disease'],
  },
  {
    id: 'drug-110',
    rxcui: '2551',
    atc_code: 'J01MA02',
    is_who_essential: true,
    brand_name: 'Ciplox 500 / Cipro',
    generic_name: 'Ciprofloxacin',
    therapeutic_class: 'Fluoroquinolone Antibacterial',
    is_nlem: true,
    dosage_form: 'Tablet',
    strength: '500 mg',
    route: 'Oral',
    default_schedule: '1-0-1',
    food_instructions: 'Drink plenty of water; do not take with antacids or milk',
    allergy_classes: ['Fluoroquinolone'],
    jan_aushadhi_price: 28.00,
    market_brand_price: 85.00,
    contraindications: ['Myasthenia Gravis', 'Concurrent Tizanidine use'],
  },
];

export class DrugCatalogService {
  /**
   * Search drug catalog by generic name, brand name, or RxCUI.
   */
  public static async searchDrugs(searchQuery: string, limit: number = 20): Promise<DrugCatalogItem[]> {
    if (!searchQuery || searchQuery.trim().length === 0) {
      return FALLBACK_DRUG_CATALOG.slice(0, limit);
    }

    const term = `%${searchQuery.trim()}%`;
    try {
      const res = await query(
        `SELECT * FROM public.drug_catalog
         WHERE generic_name ILIKE $1 
            OR brand_name ILIKE $1 
            OR therapeutic_class ILIKE $1
            OR rxcui ILIKE $1
         ORDER BY 
           CASE 
             WHEN generic_name ILIKE $2 THEN 1
             WHEN brand_name ILIKE $2 THEN 2
             ELSE 3
           END,
           generic_name ASC
         LIMIT $3`,
        [term, `${searchQuery.trim()}%`, limit]
      );

      if (res.rows.length > 0) {
        return res.rows.map(this.mapDrugRow);
      }
    } catch (err: any) {
      if (!isConnectionError(err)) {
        logger.error('[DrugCatalogService.searchDrugs] DB error, using fallback:', err.message || err);
      }
    }

    // In-memory fallback search
    const q = searchQuery.toLowerCase();
    return FALLBACK_DRUG_CATALOG.filter(
      (d) =>
        d.generic_name.toLowerCase().includes(q) ||
        (d.brand_name && d.brand_name.toLowerCase().includes(q)) ||
        (d.therapeutic_class && d.therapeutic_class.toLowerCase().includes(q)) ||
        (d.rxcui && d.rxcui.includes(q))
    ).slice(0, limit);
  }

  /**
   * Get drug by ID
   */
  public static async getDrugById(id: string): Promise<DrugCatalogItem | null> {
    try {
      const res = await query(`SELECT * FROM public.drug_catalog WHERE id = $1`, [id]);
      if (res.rows.length > 0) {
        return this.mapDrugRow(res.rows[0]);
      }
    } catch (err: any) {
      if (!isConnectionError(err)) {
        logger.error('[DrugCatalogService.getDrugById] DB error:', err.message || err);
      }
    }

    return FALLBACK_DRUG_CATALOG.find((d) => d.id === id) || null;
  }

  /**
   * Find generic and affordable alternatives for a drug name
   */
  public static async getGenericAlternatives(drugName: string): Promise<{
    original: string;
    generic_name: string;
    jan_aushadhi_price?: number;
    market_brand_price?: number;
    potential_savings_percent?: number;
  } | null> {
    const search = await this.searchDrugs(drugName, 1);
    if (search.length === 0) return null;

    const drug = search[0];
    const brandPrice = drug.market_brand_price || 50;
    const genericPrice = drug.jan_aushadhi_price || 12;
    const savings = Math.round(((brandPrice - genericPrice) / brandPrice) * 100);

    return {
      original: drugName,
      generic_name: drug.generic_name,
      jan_aushadhi_price: genericPrice,
      market_brand_price: brandPrice,
      potential_savings_percent: Math.max(0, savings),
    };
  }

  private static mapDrugRow(row: any): DrugCatalogItem {
    return {
      id: row.id,
      rxcui: row.rxcui,
      atc_code: row.atc_code,
      is_who_essential: row.is_who_essential,
      brand_name: row.brand_name,
      generic_name: row.generic_name,
      therapeutic_class: row.therapeutic_class,
      is_nlem: row.is_nlem,
      dosage_form: row.dosage_form,
      strength: row.strength,
      route: row.route,
      default_schedule: row.default_schedule,
      food_instructions: row.food_instructions,
      allergy_classes: row.allergy_classes || [],
      jan_aushadhi_price: row.jan_aushadhi_price ? parseFloat(row.jan_aushadhi_price) : undefined,
      market_brand_price: row.market_brand_price ? parseFloat(row.market_brand_price) : undefined,
      contraindications: row.contraindications || [],
    };
  }
}
