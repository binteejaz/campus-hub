// src/routes/auth.routes.ts
import { Router } from 'express';
import passport from 'passport';
import { rateLimit } from 'express-rate-limit';
import * as authCtrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  registerSchema, loginSchema, refreshSchema,
  forgotPasswordSchema, resetPasswordSchema,
} from '../validators/schemas';

const router = Router();

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { success: false, message: 'Too many auth attempts' } });

router.post('/register',         authLimiter, validate(registerSchema),       authCtrl.register);
router.post('/login',            authLimiter, validate(loginSchema),           authCtrl.login);
router.post('/refresh',                       validate(refreshSchema),         authCtrl.refresh);
router.post('/logout',                                                         authCtrl.logout);
router.post('/logout-all',       authenticate,                                 authCtrl.logoutAll);
router.get('/me',                authenticate,                                 authCtrl.getMe);

// Email verification
router.get('/verify-email/:token',                                             authCtrl.verifyEmail);
router.post('/resend-verification', authenticate,                              authCtrl.resendVerification);

// Password reset
router.post('/forgot-password',  authLimiter, validate(forgotPasswordSchema), authCtrl.forgotPassword);
router.post('/reset-password',   authLimiter, validate(resetPasswordSchema),  authCtrl.resetPassword);

// Google OAuth
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', passport.authenticate('google', { session: false, failureRedirect: '/login' }), authCtrl.googleCallback);

export default router;
