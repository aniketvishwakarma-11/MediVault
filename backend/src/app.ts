import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { securityHeaders } from './middleware/security';
import documentRoutes from './routes/document.routes';
import aiRoutes from './routes/ai.routes';
import doctorRoutes from './routes/doctor.routes';
import timelineRoutes from './routes/timeline.routes';
import emergencyRoutes from './routes/emergency.routes';
import consentRoutes from './routes/consent.routes';
import copilotRoutes from './routes/copilot.routes';
import doctorCopilotRoutes from './routes/doctor-copilot.routes';
import prescriptionRoutes from './routes/prescription.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import webauthnRoutes from './routes/webauthn.routes';
import governmentRoutes from './routes/government.routes';
import { initializeMinioBucket } from './config/minio';
import { sendError } from './utils/response';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();

// Security Headers & CORS (Allows both Localhost and Vercel domains)
app.use(securityHeaders);

const configuredOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : [];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow server-to-server, mobile, curl, or same-origin requests with no origin header
      if (!origin) return callback(null, true);

      // Whitelist checks: Localhost, Vercel deployments, and configured origins
      const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      const isVercel = /^https:\/\/.*\.vercel\.app$/.test(origin);
      const isConfigured = configuredOrigins.includes(origin);

      if (isLocalhost || isVercel || isConfigured) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'UP', service: 'MediVault Document Management API', timestamp: new Date().toISOString() });
});

// Public Maintenance Mode Status Endpoint
app.get('/system/maintenance', async (req: Request, res: Response) => {
  try {
    const { AdminService } = await import('./services/admin.service');
    const settings = await AdminService.getSystemSettings();
    const maintenance = settings?.settings?.maintenance || { enabled: false, message: '' };
    res.status(200).json({ success: true, maintenance });
  } catch (e: any) {
    res.status(200).json({ success: true, maintenance: { enabled: false, message: '' } });
  }
});

// System Storage Migration Trigger Endpoint
app.post('/system/migrate-storage', async (req: Request, res: Response) => {
  try {
    const { MinioStorageService } = await import('./storage/minioStorage');
    const result = await MinioStorageService.migrateLegacyPatientFolders();
    res.status(200).json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Storage Debug Endpoint
app.get('/system/storage-debug', async (req: Request, res: Response) => {
  try {
    const { getMinioClient, getMinioBucketName } = await import('./config/minio');
    const client = getMinioClient();
    const bucket = getMinioBucketName();
    const allObjects: string[] = [];
    const stream = client.listObjects(bucket, '', true);
    for await (const item of stream) {
      if (item && item.name) allObjects.push(item.name);
    }
    res.status(200).json({
      success: true,
      bucket,
      count: allObjects.length,
      objects: allObjects,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Mount Module Routes
app.use('/documents', documentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/ai', aiRoutes);
app.use('/system/ai', aiRoutes);
app.use('/doctor', doctorRoutes);
app.use('/api/doctor', doctorRoutes);
app.use('/timeline', timelineRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/emergency', emergencyRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/consent', consentRoutes);
app.use('/api/consent', consentRoutes);
app.use('/copilot', copilotRoutes);
app.use('/api/copilot', copilotRoutes);
app.use('/api/doctor/copilot', doctorCopilotRoutes);
app.use('/prescriptions', prescriptionRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/admin', adminRoutes);
app.use('/api/admin', adminRoutes);
app.use('/notifications', notificationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/auth/webauthn', webauthnRoutes);
app.use('/api/auth/webauthn', webauthnRoutes);
app.use('/government', governmentRoutes);
app.use('/api/government', governmentRoutes);

// 404 Route Handler
app.use((req: Request, res: Response) => {
  sendError(res, 404, `Route ${req.method} ${req.originalUrl} not found.`);
});

// Global Express Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('[Global Application Error]:', err);
  sendError(res, err.status || 500, err.message || 'Internal Server Error');
});

// Server Initialization
const PORT = process.env.PORT || 5000;

import { runAutoMigrations } from './config/migrate';

export const startServer = async () => {
  try {
    // Run Database Migrations to ensure AI schema tables exist
    await runAutoMigrations();

    // Initialize MinIO Object Storage Bucket
    logger.info('[App Startup] Initializing MinIO Object Storage connection...');
    await initializeMinioBucket();

    // Migrate any legacy P-* folders in MinIO/DB to human-readable format in background
    import('./storage/minioStorage').then(({ MinioStorageService }) => {
      MinioStorageService.migrateLegacyPatientFolders().catch((mErr) => {
        logger.warn('[App Startup] Storage folder migration notice:', mErr.message || mErr);
      });
    });

    // Start Periodic Medication Reminder Dispatcher (every 60s)
    import('./services/medication-reminder.service').then(({ MedicationReminderService }) => {
      setInterval(() => {
        MedicationReminderService.dispatchDueReminders().catch((rErr) => {
          logger.warn('[MedicationReminderService] Interval dispatch error:', rErr.message || rErr);
        });
      }, 60000);
    });

    app.listen(PORT, () => {
      logger.info(`🚀 MediVault Document Management Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('[App Startup Error] Server failed to start:', error);
  }
};

// Start application if executed directly
if (require.main === module) {
  startServer();
}

export default app;
