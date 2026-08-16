import { Request, Response } from 'express';
import { DoctorService } from '../services/doctor.service';
import { AIService } from '../services/ai.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class DoctorController {
  /**
   * Get Current Doctor Profile
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'demo-doctor-uid';
      const profile = await DoctorService.getDoctorProfileByUserId(userId);

      if (!profile) {
        // Fallback to demo doctor profile
        const demo = DoctorService.getDemoDoctorProfile(userId);
        sendSuccess(res, 200, demo, 'Doctor profile retrieved (Demo Mode)');
        return;
      }

      sendSuccess(res, 200, profile, 'Doctor profile retrieved successfully');
    } catch (err: any) {
      logger.error('[DoctorController.getProfile Error]:', err);
      sendError(res, 500, err.message || 'Failed to fetch doctor profile');
    }
  }

  /**
   * Search Patients
   */
  public static async searchPatients(req: Request, res: Response): Promise<void> {
    try {
      const q = (req.query.q as string) || '';
      const bloodGroup = (req.query.bloodGroup as string) || undefined;
      const gender = (req.query.gender as string) || undefined;

      const patients = await DoctorService.searchPatients(q, { bloodGroup, gender });
      sendSuccess(res, 200, patients, 'Patients retrieved successfully');
    } catch (err: any) {
      logger.error('[DoctorController.searchPatients Error]:', err);
      sendError(res, 500, err.message || 'Failed to search patients');
    }
  }

  /**
   * Request Patient Access
   */
  public static async requestAccess(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      const { patientId, purpose } = req.body;

      if (!patientId || !purpose) {
        sendError(res, 400, 'Patient ID and purpose are required');
        return;
      }

      const consentReq = await DoctorService.requestPatientAccess(doctorId, patientId, purpose);
      sendSuccess(res, 201, consentReq, 'Consent access request sent to patient');
    } catch (err: any) {
      logger.error('[DoctorController.requestAccess Error]:', err);
      sendError(res, 500, err.message || 'Failed to send consent request');
    }
  }

  /**
   * Emergency Access Grant
   */
  public static async emergencyAccess(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      const { patientQrOrCode, reason } = req.body;

      if (!patientQrOrCode || !reason) {
        sendError(res, 400, 'Patient QR code/ID and emergency justification reason are required');
        return;
      }

      const emergencySummary = await DoctorService.grantEmergencyAccess(doctorId, patientQrOrCode, reason);
      sendSuccess(res, 200, emergencySummary, 'Emergency clinical access granted. Audit log broadcasted.');
    } catch (err: any) {
      logger.error('[DoctorController.emergencyAccess Error]:', err);
      sendError(res, 500, err.message || 'Emergency access failed');
    }
  }

  /**
   * Create Consultation Note
   */
  public static async createConsultation(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      const consultationData = { ...req.body, doctorId };

      if (!consultationData.patientId || !consultationData.diagnosis) {
        sendError(res, 400, 'Patient ID and Diagnosis are required');
        return;
      }

      const consultation = await DoctorService.createConsultation(consultationData);
      sendSuccess(res, 201, consultation, 'Consultation note created successfully');
    } catch (err: any) {
      logger.error('[DoctorController.createConsultation Error]:', err);
      sendError(res, 500, err.message || 'Failed to create consultation note');
    }
  }

  /**
   * Create Digital Prescription
   */
  public static async createPrescription(req: Request, res: Response): Promise<void> {
    try {
      const doctorId = req.user?.id;
      if (!doctorId) {
        sendError(res, 401, 'Authentication required.');
        return;
      }
      const prescriptionData = { ...req.body, doctorId };

      if (!prescriptionData.patientId || !prescriptionData.medicines || prescriptionData.medicines.length === 0) {
        sendError(res, 400, 'Patient ID and at least one prescribed medicine are required');
        return;
      }

      const prescription = await DoctorService.createPrescription(prescriptionData);
      sendSuccess(res, 201, prescription, 'Digital prescription signed and generated');
    } catch (err: any) {
      logger.error('[DoctorController.createPrescription Error]:', err);
      sendError(res, 500, err.message || 'Failed to create prescription');
    }
  }

  /**
   * AI Copilot Clinical RAG Query for Doctor
   */
  public static async queryCopilot(req: Request, res: Response): Promise<void> {
    try {
      const { patientId, prompt } = req.body;

      if (!prompt) {
        sendError(res, 400, 'Query prompt is required');
        return;
      }

      const pid = patientId || 'demo-patient-123';
      const answer = await AIService.generateHealthAnswer(pid, prompt);

      sendSuccess(res, 200, answer, 'AI Copilot response generated');
    } catch (err: any) {
      logger.error('[DoctorController.queryCopilot Error]:', err);
      sendError(res, 500, err.message || 'AI Copilot request failed');
    }
  }
}
