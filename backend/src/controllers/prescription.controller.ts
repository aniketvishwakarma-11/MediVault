import { Request, Response } from 'express';
import { PrescriptionService } from '../services/prescription.service';
import { DrugCatalogService } from '../services/drug-catalog.service';
import { PrescriptionSafetyService } from '../services/ai/prescription-safety.service';
import { PrescriptionExplainerService } from '../services/ai/prescription-explainer.service';
import { ConsentService } from '../services/consent.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class PrescriptionController {
  /**
   * GET /api/prescriptions/doctor/consented-patients
   * Returns only patients who have active APPROVED consent for this doctor
   */
  public static async getConsentedPatients(req: Request, res: Response): Promise<void> {
    try {
      const doctorUserId = String((req as any).user?.id || req.query.doctor_id || 'doc-123');
      const patients = await ConsentService.getConsentedPatientsForDoctor(doctorUserId);
      sendSuccess(res, 200, { patients, count: patients.length });
    } catch (err: any) {
      logger.error('[PrescriptionController.getConsentedPatients] Error:', err);
      sendError(res, 500, 'Failed to fetch consented patients.');
    }
  }

  /**
   * GET /api/prescriptions/catalog/search?q=met
   */
  public static async searchCatalog(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const limit = parseInt(req.query.limit as string) || 20;
      const results = await DrugCatalogService.searchDrugs(q, limit);
      sendSuccess(res, 200, { drugs: results, count: results.length });
    } catch (err: any) {
      logger.error('[PrescriptionController.searchCatalog] Error:', err);
      sendError(res, 500, 'Failed to search drug catalog.');
    }
  }

  /**
   * POST /api/prescriptions/safety-check
   */
  public static async checkSafety(req: Request, res: Response): Promise<void> {
    try {
      const { patient_id, medicines, diagnosis } = req.body;
      if (!patient_id || !medicines) {
        sendError(res, 400, 'Missing patient_id or medicines array.');
        return;
      }
      const report = await PrescriptionSafetyService.screenPrescriptionSafety(patient_id, medicines, diagnosis);
      sendSuccess(res, 200, report, 'Prescription safety screen completed.');
    } catch (err: any) {
      logger.error('[PrescriptionController.checkSafety] Error:', err);
      sendError(res, 500, 'Failed to perform safety screening.');
    }
  }

  /**
   * POST /api/prescriptions/explain
   */
  public static async explainMedicine(req: Request, res: Response): Promise<void> {
    try {
      const { medicine_name, dosage, frequency, diagnosis, recent_labs, language } = req.body;
      if (!medicine_name) {
        sendError(res, 400, 'medicine_name is required.');
        return;
      }
      const explanation = await PrescriptionExplainerService.generatePatientExplanation(
        medicine_name,
        dosage,
        frequency,
        diagnosis,
        recent_labs,
        language || 'English'
      );
      sendSuccess(res, 200, explanation, 'Patient explanation generated.');
    } catch (err: any) {
      logger.error('[PrescriptionController.explainMedicine] Error:', err);
      sendError(res, 500, 'Failed to generate explanation.');
    }
  }

  /**
   * POST /api/prescriptions
   */
  public static async createPrescription(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = (req as any).user?.id || req.body.doctorId || 'doc-123';
      const payload = {
        ...req.body,
        doctorId,
      };
      if (!payload.patientId || !payload.medicines || payload.medicines.length === 0) {
        sendError(res, 400, 'patientId and at least one medicine required.');
        return;
      }
      const rx = await PrescriptionService.createPrescription(payload);
      sendSuccess(res, 201, rx, 'Prescription created and notarized successfully.');
    } catch (err: any) {
      logger.error('[PrescriptionController.createPrescription] Error:', err);
      sendError(res, 500, err.message || 'Failed to create prescription.');
    }
  }

  /**
   * GET /api/prescriptions/patient/:id
   */
  public static async getPatientPrescriptions(req: Request, res: Response): Promise<void> {
    try {
      const patientId = String(req.params.id || (req as any).user?.id || 'pat-1001');
      const list = await PrescriptionService.getPatientPrescriptions(patientId);
      sendSuccess(res, 200, { prescriptions: list, total: list.length });
    } catch (err: any) {
      logger.error('[PrescriptionController.getPatientPrescriptions] Error:', err);
      sendError(res, 500, 'Failed to fetch patient prescriptions.');
    }
  }

  /**
   * GET /api/prescriptions/verify/:id (Public endpoint)
   */
  public static async verifyPrescription(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const verification = await PrescriptionService.verifyPrescription(id);
      sendSuccess(res, 200, verification, 'Prescription verified successfully.');
    } catch (err: any) {
      logger.error('[PrescriptionController.verifyPrescription] Error:', err);
      sendError(res, 404, 'Prescription not found or invalid.');
    }
  }

  /**
   * POST /api/prescriptions/:id/dispense (Pharmacy fulfillment)
   */
  public static async dispensePrescription(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { pharmacy_name, pharmacist_name, pharmacist_license, is_full } = req.body;
      const result = await PrescriptionService.dispensePrescription(id, {
        pharmacy_name: pharmacy_name || 'Community Pharmacy Partner',
        pharmacist_name,
        pharmacist_license,
        is_full: is_full !== false,
      });
      sendSuccess(res, 200, result, 'Prescription marked as dispensed.');
    } catch (err: any) {
      logger.error('[PrescriptionController.dispensePrescription] Error:', err);
      sendError(res, 500, 'Failed to record dispensation.');
    }
  }

  /**
   * GET /api/prescriptions/adherence/today
   */
  public static async getTodayDoses(req: Request, res: Response): Promise<void> {
    try {
      const patientId = String((req as any).user?.id || req.query.patient_id || 'pat-1001');
      const slots = await PrescriptionService.getTodayDoses(patientId);
      sendSuccess(res, 200, { slots });
    } catch (err: any) {
      logger.error('[PrescriptionController.getTodayDoses] Error:', err);
      sendError(res, 500, 'Failed to load today doses.');
    }
  }

  /**
   * POST /api/prescriptions/adherence/log
   */
  public static async logAdherence(req: Request, res: Response): Promise<void> {
    try {
      const patientId = (req as any).user?.id || req.body.patient_id || 'pat-1001';
      const { item_id, slot, status, notes } = req.body;
      if (!item_id || !slot || !status) {
        sendError(res, 400, 'item_id, slot, and status are required.');
        return;
      }
      const log = await PrescriptionService.logAdherence(patientId, item_id, slot, status, notes);
      sendSuccess(res, 200, log, 'Dose status recorded.');
    } catch (err: any) {
      logger.error('[PrescriptionController.logAdherence] Error:', err);
      sendError(res, 500, 'Failed to log adherence.');
    }
  }

  /**
   * POST /api/prescriptions/refill/request
   */
  public static async requestRefill(req: Request, res: Response): Promise<void> {
    try {
      const patientId = (req as any).user?.id || req.body.patient_id || 'pat-1001';
      const { prescription_id, notes } = req.body;
      if (!prescription_id) {
        sendError(res, 400, 'prescription_id is required.');
        return;
      }
      const result = await PrescriptionService.requestRefill(prescription_id, patientId, notes);
      sendSuccess(res, 201, result, 'Prescription refill request sent to your doctor.');
    } catch (err: any) {
      logger.error('[PrescriptionController.requestRefill] Error:', err);
      sendError(res, 500, 'Failed to submit refill request.');
    }
  }

  /**
   * GET /api/prescriptions/doctor/history
   */
  public static async getDoctorHistory(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = String((req as any).user?.id || req.query.doctor_id || 'doc-123');
      const prescriptions = await PrescriptionService.getDoctorPrescriptions(doctorId);
      sendSuccess(res, 200, { prescriptions, count: prescriptions.length });
    } catch (err: any) {
      logger.error('[PrescriptionController.getDoctorHistory] Error:', err);
      sendError(res, 500, 'Failed to fetch doctor prescription history.');
    }
  }

  /**
   * POST /api/prescriptions/:id/cancel
   */
  public static async cancelPrescription(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = String((req as any).user?.id || 'doc-123');
      const prescriptionId = String(req.params.id);
      const { reason } = req.body;
      const result = await PrescriptionService.cancelPrescription(prescriptionId, doctorId, reason);
      sendSuccess(res, 200, result, 'Prescription revoked/cancelled successfully.');
    } catch (err: any) {
      logger.error('[PrescriptionController.cancelPrescription] Error:', err);
      sendError(res, 500, 'Failed to cancel prescription.');
    }
  }

  /**
   * DELETE /api/prescriptions/:id
   */
  public static async deletePrescription(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = String((req as any).user?.id || 'doc-123');
      const prescriptionId = String(req.params.id);
      const result = await PrescriptionService.deletePrescription(prescriptionId, doctorId);
      sendSuccess(res, 200, result, 'Prescription deleted successfully.');
    } catch (err: any) {
      logger.error('[PrescriptionController.deletePrescription] Error:', err);
      sendError(res, 500, 'Failed to delete prescription.');
    }
  }

  /**
   * GET /api/prescriptions/refill/queue
   * Doctor fetches all pending refill requests assigned to them
   */
  public static async getRefillQueue(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = String((req as any).user?.id || req.query.doctor_id || 'doc-123');
      const result = await PrescriptionService.getRefillQueue(doctorId);
      sendSuccess(res, 200, { refillRequests: result, count: result.length });
    } catch (err: any) {
      logger.error('[PrescriptionController.getRefillQueue] Error:', err);
      sendError(res, 500, 'Failed to fetch refill queue.');
    }
  }

  /**
   * POST /api/prescriptions/refill/:id/approve
   * Doctor approves or rejects a refill request
   */
  public static async approveRefill(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = String((req as any).user?.id || 'doc-123');
      const refillId = String(req.params.id);
      const { action, notes } = req.body; // action: 'APPROVED' | 'REJECTED'
      if (!action || !['APPROVED', 'REJECTED'].includes(action)) {
        sendError(res, 400, 'action must be APPROVED or REJECTED.');
        return;
      }
      const result = await PrescriptionService.resolveRefill(refillId, doctorId, action, notes);
      sendSuccess(res, 200, result, `Refill request ${action.toLowerCase()} successfully.`);
    } catch (err: any) {
      logger.error('[PrescriptionController.approveRefill] Error:', err);
      sendError(res, 500, 'Failed to process refill request.');
    }
  }
}
