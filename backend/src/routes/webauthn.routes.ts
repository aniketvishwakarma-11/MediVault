import { Router } from 'express';
import { WebAuthnController } from '../controllers/webauthn.controller';
import { authenticateJWT } from '../middleware/auth';

const router = Router();

// Public Authentication Endpoints (1-Tap Passkey Sign-In & Demo Access)
router.post('/demo-token', WebAuthnController.getDemoToken);
router.post('/login-options', WebAuthnController.getLoginOptions);
router.post('/login-verify', WebAuthnController.verifyLogin);

// Protected Registration Endpoints (Enroll Device)
router.post('/register-options', authenticateJWT, WebAuthnController.getRegisterOptions);
router.post('/register-verify', authenticateJWT, WebAuthnController.verifyRegister);

// Protected Device Management Endpoints (List & Revoke Passkeys)
router.get('/passkeys', authenticateJWT, WebAuthnController.listPasskeys);
router.delete('/passkeys/:id', authenticateJWT, WebAuthnController.deletePasskey);

export default router;
