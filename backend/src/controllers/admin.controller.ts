import { Request, Response } from 'express';
import { AdminService } from '../services/admin.service';
import { sendSuccess, sendError } from '../utils/response';
import { logger } from '../utils/logger';

export class AdminController {
  /**
   * GET /admin/dashboard/stats
   * Returns all platform-wide KPI metrics for the admin dashboard.
   */
  static async getDashboardStats(req: Request, res: Response) {
    try {
      const [stats, snapshot, recentActivity] = await Promise.all([
        AdminService.getDashboardStats(),
        AdminService.getSystemSnapshot(),
        AdminService.getRecentActivity(10),
      ]);

      return sendSuccess(
        res,
        200,
        { stats, snapshot, recent_activity: recentActivity },
        'Admin dashboard stats fetched successfully'
      );
    } catch (error: any) {
      logger.error('[AdminController.getDashboardStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch admin dashboard statistics');
    }
  }

  /**
   * GET /admin/users
   * Returns paginated users with optional search and role filtering.
   */
  static async getUsers(req: Request, res: Response) {
    try {
      const { page, limit, search, role } = req.query;

      const result = await AdminService.getUsers({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        role: role as string,
      });

      return sendSuccess(res, 200, result, 'Users fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getUsers] Error:', error);
      return sendError(res, 500, 'Failed to fetch users directory');
    }
  }

  /**
   * GET /admin/users/:id
   * Returns detailed user profile with associated medical and clinical facts.
   */
  static async getUserById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const user = await AdminService.getUserById(id);

      if (!user) {
        return sendError(res, 404, 'User not found');
      }

      return sendSuccess(res, 200, user, 'User details fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getUserById] Error:', error);
      return sendError(res, 500, 'Failed to fetch user details');
    }
  }

  /**
   * PATCH /admin/users/:id/role
   * Updates user role (patient, doctor, hospital, admin).
   */
  static async updateUserRole(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { role } = req.body;
      const adminId = (req as any).user?.id;

      if (!role) {
        return sendError(res, 400, 'Target role is required');
      }

      const updated = await AdminService.updateUserRole(id, role, adminId);
      return sendSuccess(res, 200, updated, `User role successfully updated to ${role}`);
    } catch (error: any) {
      logger.error('[AdminController.updateUserRole] Error:', error);
      return sendError(res, 400, error.message || 'Failed to update user role');
    }
  }

  /**
   * GET /admin/doctors/pending
   * Returns list of doctors pending credential verification.
   */
  static async getPendingDoctors(req: Request, res: Response) {
    try {
      const pendingDoctors = await AdminService.getPendingDoctors();
      return sendSuccess(res, 200, { doctors: pendingDoctors }, 'Pending doctor verifications fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getPendingDoctors] Error:', error);
      return sendError(res, 500, 'Failed to fetch pending doctor verifications');
    }
  }

  /**
   * PATCH /admin/doctors/:id/verify
   * Approves or rejects doctor credentials.
   */
  static async verifyDoctor(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { status, rejection_reason } = req.body;
      const adminId = (req as any).user?.id;

      if (!status || !['VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status.toUpperCase())) {
        return sendError(res, 400, 'Valid status is required (VERIFIED, REJECTED, SUSPENDED)');
      }

      const verified = await AdminService.verifyDoctor(
        id,
        status.toUpperCase(),
        rejection_reason,
        adminId
      );

      return sendSuccess(
        res,
        200,
        verified,
        `Doctor credential verification status set to ${status.toUpperCase()}`
      );
    } catch (error: any) {
      logger.error('[AdminController.verifyDoctor] Error:', error);
      return sendError(res, 400, error.message || 'Failed to process doctor verification');
    }
  }

  /**
   * GET /admin/analytics
   * Returns complete BI Analytics dataset for charts and trends.
   */
  static async getAnalytics(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const data = await AdminService.getAnalyticsData(days);

      return sendSuccess(res, 200, data, 'BI Analytics data fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAnalytics] Error:', error);
      return sendError(res, 500, 'Failed to fetch analytics data');
    }
  }

  /**
   * GET /admin/documents
   * Returns paginated list of documents with metadata, patient context, and AI status.
   */
  static async getDocuments(req: Request, res: Response) {
    try {
      const { page, limit, search, category, status } = req.query;

      const result = await AdminService.getDocuments({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        category: category as string,
        status: status as string,
      });

      return sendSuccess(res, 200, result, 'Documents fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getDocuments] Error:', error);
      return sendError(res, 500, 'Failed to fetch documents registry');
    }
  }

  /**
   * GET /admin/documents/:id
   * Returns detailed document record with AI clinical extraction and blockchain proof.
   */
  static async getDocumentById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const document = await AdminService.getDocumentById(id);

      if (!document) {
        return sendError(res, 404, 'Document not found');
      }

      return sendSuccess(res, 200, document, 'Document details fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getDocumentById] Error:', error);
      return sendError(res, 500, 'Failed to fetch document details');
    }
  }

  /**
   * GET /admin/documents/:id/download
   * Generates secure signed URL for admin to view or download raw file.
   */
  static async getDocumentDownloadUrl(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await AdminService.getDocumentDownloadUrl(id);

      return sendSuccess(res, 200, result, 'Download URL generated successfully');
    } catch (error: any) {
      logger.error('[AdminController.getDocumentDownloadUrl] Error:', error);
      return sendError(res, 500, error.message || 'Failed to generate download URL');
    }
  }

  /**
   * DELETE /admin/documents/:id
   * Hard purges a document and cascades deletion across all child tables and MinIO.
   */
  static async deleteDocument(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await AdminService.deleteDocument(id);

      if (!result) {
        return sendError(res, 404, 'Document not found or already deleted');
      }

      return sendSuccess(res, 200, { id }, 'Document and all associated clinical entities permanently purged');
    } catch (error: any) {
      logger.error('[AdminController.deleteDocument] Error:', error);
      return sendError(res, 500, error.message || 'Failed to delete document');
    }
  }

  /**
   * GET /admin/storage/stats
   * Returns storage capacity, category sizes, and AI notarization metrics.
   */
  static async getStorageStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getStorageStats();
      return sendSuccess(res, 200, stats, 'Storage statistics fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getStorageStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch storage statistics');
    }
  }

  /**
   * GET /admin/consents
   * Returns paginated consent grants with scope and status filters.
   */
  static async getConsents(req: Request, res: Response) {
    try {
      const { page, limit, search, status } = req.query;

      const result = await AdminService.getConsents({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        status: status as string,
      });

      return sendSuccess(res, 200, result, 'Consent grants fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getConsents] Error:', error);
      return sendError(res, 500, 'Failed to fetch consent grants');
    }
  }

  /**
   * GET /admin/consents/:id
   * Returns detailed consent grant with audit trail.
   */
  static async getConsentById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const consent = await AdminService.getConsentById(id);

      if (!consent) {
        return sendError(res, 404, 'Consent grant not found');
      }

      return sendSuccess(res, 200, consent, 'Consent grant details fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getConsentById] Error:', error);
      return sendError(res, 500, 'Failed to fetch consent details');
    }
  }

  /**
   * PATCH /admin/consents/:id/revoke
   * Admin emergency revocation of a consent grant.
   */
  static async revokeConsent(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;

      const revoked = await AdminService.revokeConsent(id, adminId, reason);
      return sendSuccess(res, 200, revoked, 'Consent grant successfully revoked by administrator');
    } catch (error: any) {
      logger.error('[AdminController.revokeConsent] Error:', error);
      return sendError(res, 400, error.message || 'Failed to revoke consent grant');
    }
  }

  /**
   * GET /admin/emergency/sessions
   * Returns all emergency break-glass sessions with live status.
   */
  static async getEmergencySessions(req: Request, res: Response) {
    try {
      const result = await AdminService.getEmergencySessions();
      return sendSuccess(res, 200, result, 'Emergency break-glass sessions fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getEmergencySessions] Error:', error);
      return sendError(res, 500, 'Failed to fetch emergency sessions');
    }
  }

  /**
   * PATCH /admin/emergency/sessions/:id/revoke
   * Admin termination of an active emergency session.
   */
  static async revokeEmergencySession(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const adminId = (req as any).user?.id;

      const revoked = await AdminService.revokeEmergencySession(id, adminId, reason);
      return sendSuccess(res, 200, revoked, 'Emergency session terminated by administrator');
    } catch (error: any) {
      logger.error('[AdminController.revokeEmergencySession] Error:', error);
      return sendError(res, 400, error.message || 'Failed to terminate emergency session');
    }
  }

  /**
   * GET /admin/audit-logs
   * Returns paginated HIPAA audit logs with filter and search capabilities.
   */
  static async getAuditLogs(req: Request, res: Response) {
    try {
      const { page, limit, search, action, role, resource_type, days } = req.query;

      const result = await AdminService.getAuditLogs({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 25,
        search: search as string,
        action: action as string,
        role: role as string,
        resource_type: resource_type as string,
        days: days ? parseInt(days as string) : undefined,
      });

      return sendSuccess(res, 200, result, 'Audit logs fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getAuditLogs] Error:', error);
      return sendError(res, 500, 'Failed to fetch audit logs');
    }
  }

  /**
   * GET /admin/audit-logs/:id
   * Returns single detailed audit log entry.
   */
  static async getAuditLogById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const log = await AdminService.getAuditLogById(id);

      if (!log) {
        return sendError(res, 404, 'Audit log entry not found');
      }

      return sendSuccess(res, 200, log, 'Audit log details fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAuditLogById] Error:', error);
      return sendError(res, 500, 'Failed to fetch audit log details');
    }
  }

  /**
   * GET /admin/audit-logs/export
   * Generates complete audit log dataset for HIPAA compliance downloads.
   */
  static async getAuditLogExport(req: Request, res: Response) {
    try {
      const days = req.query.days ? parseInt(req.query.days as string) : 30;
      const logs = await AdminService.getAuditLogExport(days);

      return sendSuccess(res, 200, logs, 'Audit logs exported successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAuditLogExport] Error:', error);
      return sendError(res, 500, 'Failed to export audit logs');
    }
  }

  /**
   * GET /admin/audit-logs/stats
   * Statistical breakdown of platform audit actions.
   */
  static async getAuditStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getAuditStats();
      return sendSuccess(res, 200, stats, 'Audit statistics fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAuditStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch audit statistics');
    }
  }

  /**
   * GET /admin/system/health
   * Live operational health check of all platform subsystems.
   */
  static async getSystemHealth(req: Request, res: Response) {
    try {
      const health = await AdminService.getSystemHealth();
      return sendSuccess(res, 200, health, 'System health fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getSystemHealth] Error:', error);
      return sendError(res, 500, 'Failed to run system health check');
    }
  }

  /**
   * POST /admin/system/ping/:service
   * Diagnostic ping on a specific service.
   */
  static async pingService(req: Request, res: Response) {
    try {
      const service = req.params.service as string;
      const result = await AdminService.pingService(service);
      return sendSuccess(res, 200, result, `Ping to ${service} completed`);
    } catch (error: any) {
      logger.error('[AdminController.pingService] Error:', error);
      return sendError(res, 400, error.message || 'Failed to ping service');
    }
  }

  /**
   * GET /admin/prescriptions
   * Returns paginated clinical prescriptions list.
   */
  static async getPrescriptions(req: Request, res: Response) {
    try {
      const { page, limit, search, status } = req.query;

      const result = await AdminService.getPrescriptions({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        status: status as string,
      });

      return sendSuccess(res, 200, result, 'Prescriptions fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getPrescriptions] Error:', error);
      return sendError(res, 500, 'Failed to fetch prescriptions');
    }
  }

  /**
   * GET /admin/prescriptions/:id
   * Returns single prescription with complete items and AI explanation.
   */
  static async getPrescriptionById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const prescription = await AdminService.getPrescriptionById(id);

      if (!prescription) {
        return sendError(res, 404, 'Prescription not found');
      }

      return sendSuccess(res, 200, prescription, 'Prescription details fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getPrescriptionById] Error:', error);
      return sendError(res, 500, 'Failed to fetch prescription details');
    }
  }

  /**
   * GET /admin/drugs/catalog
   * Standardized medications catalog.
   */
  static async getDrugCatalog(req: Request, res: Response) {
    try {
      const { page, limit, search, class: therapeuticClass } = req.query;

      const result = await AdminService.getDrugCatalog({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        search: search as string,
        class: therapeuticClass as string,
      });

      return sendSuccess(res, 200, result, 'Drug catalog fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getDrugCatalog] Error:', error);
      return sendError(res, 500, 'Failed to fetch drug catalog');
    }
  }

  /**
   * POST /admin/drugs/catalog
   * Create new standardized medication entry.
   */
  static async createDrugCatalogItem(req: Request, res: Response) {
    try {
      const drug = await AdminService.createDrugCatalogItem(req.body);
      return sendSuccess(res, 201, drug, 'Medication added to catalog successfully');
    } catch (error: any) {
      logger.error('[AdminController.createDrugCatalogItem] Error:', error);
      return sendError(res, 400, error.message || 'Failed to add medication to catalog');
    }
  }

  /**
   * PATCH /admin/drugs/catalog/:id
   * Update medication in catalog.
   */
  static async updateDrugCatalogItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const drug = await AdminService.updateDrugCatalogItem(id, req.body);
      return sendSuccess(res, 200, drug, 'Medication updated successfully');
    } catch (error: any) {
      logger.error('[AdminController.updateDrugCatalogItem] Error:', error);
      return sendError(res, 400, error.message || 'Failed to update medication');
    }
  }

  /**
   * DELETE /admin/drugs/catalog/:id
   * Delete medication from catalog.
   */
  static async deleteDrugCatalogItem(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const result = await AdminService.deleteDrugCatalogItem(id);
      return sendSuccess(res, 200, result, 'Medication removed from catalog');
    } catch (error: any) {
      logger.error('[AdminController.deleteDrugCatalogItem] Error:', error);
      return sendError(res, 400, error.message || 'Failed to delete medication');
    }
  }

  /**
   * GET /admin/ai/stats
   * Aggregated AI metrics and token telemetry.
   */
  static async getAIStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getAIStats();
      return sendSuccess(res, 200, stats, 'AI statistics fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAIStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch AI statistics');
    }
  }

  /**
   * GET /admin/ai/logs
   * Paginated AI execution logs.
   */
  static async getAILogs(req: Request, res: Response) {
    try {
      const { page, limit, search, category } = req.query;

      const result = await AdminService.getAILogs({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 15,
        search: search as string,
        category: category as string,
      });

      return sendSuccess(res, 200, result, 'AI logs fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getAILogs] Error:', error);
      return sendError(res, 500, 'Failed to fetch AI logs');
    }
  }

  /**
   * GET /admin/ai/vectors
   * Qdrant vector index telemetry.
   */
  static async getAIVectorStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getAIVectorStats();
      return sendSuccess(res, 200, stats, 'AI vector stats fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getAIVectorStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch AI vector statistics');
    }
  }

  /**
   * POST /admin/ai/test-extract
   * Live AI Sandbox extraction test.
   */
  static async testClinicalExtraction(req: Request, res: Response) {
    try {
      const { text } = req.body;
      const result = await AdminService.testClinicalExtraction(text);
      return sendSuccess(res, 200, result, 'AI extraction completed');
    } catch (error: any) {
      logger.error('[AdminController.testClinicalExtraction] Error:', error);
      return sendError(res, 400, error.message || 'Failed to execute clinical extraction test');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PHASE 10: NOTIFICATION CENTER & SYSTEM CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * GET /admin/notifications
   * Returns paginated system broadcasts.
   */
  static async getNotifications(req: Request, res: Response) {
    try {
      const { page, limit, target_role, severity, search } = req.query;

      const result = await AdminService.getNotifications({
        page: page ? parseInt(page as string) : 1,
        limit: limit ? parseInt(limit as string) : 20,
        target_role: target_role as string,
        severity: severity as string,
        search: search as string,
      });

      return sendSuccess(res, 200, result, 'Notifications fetched successfully', result.pagination);
    } catch (error: any) {
      logger.error('[AdminController.getNotifications] Error:', error);
      return sendError(res, 500, 'Failed to fetch notifications');
    }
  }

  /**
   * GET /admin/notifications/stats
   * Broadcast reach and category KPIs.
   */
  static async getNotificationStats(req: Request, res: Response) {
    try {
      const stats = await AdminService.getNotificationStats();
      return sendSuccess(res, 200, stats, 'Notification statistics fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getNotificationStats] Error:', error);
      return sendError(res, 500, 'Failed to fetch notification statistics');
    }
  }

  /**
   * POST /admin/notifications/broadcast
   * Dispatches a new system broadcast to targeted roles.
   */
  static async createBroadcastNotification(req: Request, res: Response) {
    try {
      const { title, message, target_role, severity, delivery_channel, action_url } = req.body;
      const senderId = (req as any).user?.id;

      const result = await AdminService.createBroadcastNotification({
        title,
        message,
        target_role,
        severity,
        delivery_channel,
        action_url,
        sender_id: senderId,
      });

      return sendSuccess(res, 201, result, 'Broadcast notification dispatched successfully');
    } catch (error: any) {
      logger.error('[AdminController.createBroadcastNotification] Error:', error);
      return sendError(res, 400, error.message || 'Failed to dispatch broadcast');
    }
  }

  /**
   * DELETE /admin/notifications/:id
   * Removes a notification.
   */
  static async deleteNotification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await AdminService.deleteNotification(id as string);

      if (!deleted) {
        return sendError(res, 404, 'Notification not found');
      }

      return sendSuccess(res, 200, { id }, 'Notification deleted successfully');
    } catch (error: any) {
      logger.error('[AdminController.deleteNotification] Error:', error);
      return sendError(res, 500, 'Failed to delete notification');
    }
  }

  /**
   * GET /admin/settings
   * Returns enterprise system settings configuration.
   */
  static async getSystemSettings(req: Request, res: Response) {
    try {
      const result = await AdminService.getSystemSettings();
      return sendSuccess(res, 200, result, 'System settings fetched successfully');
    } catch (error: any) {
      logger.error('[AdminController.getSystemSettings] Error:', error);
      return sendError(res, 500, 'Failed to fetch system settings');
    }
  }

  /**
   * PATCH /admin/settings/:key
   * Updates an enterprise system configuration section.
   */
  static async updateSystemSettings(req: Request, res: Response) {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const updatedBy = (req as any).user?.id;

      const result = await AdminService.updateSystemSettings(key as string, value, updatedBy);
      return sendSuccess(res, 200, result, `System settings for '${key}' updated successfully`);
    } catch (error: any) {
      logger.error('[AdminController.updateSystemSettings] Error:', error);
      return sendError(res, 400, error.message || 'Failed to update system settings');
    }
  }
}
