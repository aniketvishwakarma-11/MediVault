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
import { initializeMinioBucket } from './config/minio';
import { sendError } from './utils/response';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();

// Security Headers & CORS
app.use(securityHeaders);
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
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
