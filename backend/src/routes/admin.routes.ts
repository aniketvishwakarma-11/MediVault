import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT, authorizeRoles } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Admin-specific rate limiter — generous for internal tooling
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many admin requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply auth + admin role enforcement to ALL routes in this file
router.use(adminRateLimiter);
router.use(authenticateJWT);
router.use(authorizeRoles('admin'));

// ─── Dashboard ───────────────────────────────────────────────────────────────
router.get('/dashboard/stats', AdminController.getDashboardStats);

// ─── User Management ─────────────────────────────────────────────────────────
router.get('/users', AdminController.getUsers);
router.get('/users/:id', AdminController.getUserById);
router.patch('/users/:id/role', AdminController.updateUserRole);

// ─── Doctor Verification Queue ───────────────────────────────────────────────
router.get('/doctors/pending', AdminController.getPendingDoctors);
router.patch('/doctors/:id/verify', AdminController.verifyDoctor);

// ─── BI Analytics & Platform Intelligence ────────────────────────────────────
router.get('/analytics', AdminController.getAnalytics);

// ─── Document Registry & Storage Management ──────────────────────────────────
router.get('/documents', AdminController.getDocuments);
router.get('/documents/:id', AdminController.getDocumentById);
router.get('/documents/:id/download', AdminController.getDocumentDownloadUrl);
router.delete('/documents/:id', AdminController.deleteDocument);
router.get('/storage/stats', AdminController.getStorageStats);

// ─── Consent Registry & Emergency Break-Glass ────────────────────────────────
router.get('/consents', AdminController.getConsents);
router.get('/consents/:id', AdminController.getConsentById);
router.patch('/consents/:id/revoke', AdminController.revokeConsent);
router.get('/emergency/sessions', AdminController.getEmergencySessions);
router.patch('/emergency/sessions/:id/revoke', AdminController.revokeEmergencySession);

// ─── HIPAA Audit Trail Explorer ──────────────────────────────────────────────
router.get('/audit-logs', AdminController.getAuditLogs);
router.get('/audit-logs/export', AdminController.getAuditLogExport);
router.get('/audit-logs/stats', AdminController.getAuditStats);
router.get('/audit-logs/:id', AdminController.getAuditLogById);

// ─── Real-Time System Health & Diagnostic Pings ──────────────────────────────
router.get('/system/health', AdminController.getSystemHealth);
router.post('/system/ping/:service', AdminController.pingService);

// ─── Prescription Registry & Drug Catalog Master ────────────────────────────
router.get('/prescriptions', AdminController.getPrescriptions);
router.get('/prescriptions/:id', AdminController.getPrescriptionById);
router.get('/drugs/catalog', AdminController.getDrugCatalog);
router.post('/drugs/catalog', AdminController.createDrugCatalogItem);
router.patch('/drugs/catalog/:id', AdminController.updateDrugCatalogItem);
router.delete('/drugs/catalog/:id', AdminController.deleteDrugCatalogItem);

// ─── AI Intelligence & Vector Search Cockpit ────────────────────────────────
router.get('/ai/stats', AdminController.getAIStats);
router.get('/ai/logs', AdminController.getAILogs);
router.get('/ai/vectors', AdminController.getAIVectorStats);
router.post('/ai/test-extract', AdminController.testClinicalExtraction);

// ─── Notification Center & Broadcast Engine ─────────────────────────────────
router.get('/notifications', AdminController.getNotifications);
router.get('/notifications/stats', AdminController.getNotificationStats);
router.post('/notifications/broadcast', AdminController.createBroadcastNotification);
router.delete('/notifications/:id', AdminController.deleteNotification);

// ─── Enterprise System Settings & Policies ──────────────────────────────────
router.get('/settings', AdminController.getSystemSettings);
router.patch('/settings/:key', AdminController.updateSystemSettings);

export default router;
