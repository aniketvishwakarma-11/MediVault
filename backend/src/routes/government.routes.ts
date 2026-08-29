import { Router } from 'express';
import { GovernmentIdController } from '../controllers/government-id.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// All government identity routes are protected by authenticated session
router.post('/abha/generate-otp', authenticateJWT, GovernmentIdController.generateOtp);
router.post('/abha/verify-otp', authenticateJWT, GovernmentIdController.verifyOtp);
router.post('/abha/link-existing', authenticateJWT, GovernmentIdController.linkExisting);
router.get('/abha/profile', authenticateJWT, GovernmentIdController.getProfile);
router.post('/abha/unlink', authenticateJWT, GovernmentIdController.unlink);
router.post('/digilocker/import', authenticateJWT, GovernmentIdController.importDigiLocker);

export default router;
