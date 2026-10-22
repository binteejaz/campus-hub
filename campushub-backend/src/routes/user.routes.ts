// src/routes/user.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateProfileSchema, changePasswordSchema } from '../validators/schemas';

const router = Router();

router.get('/:username',                              ctrl.getProfile);
router.patch('/me',         authenticate, validate(updateProfileSchema), ctrl.updateProfile);
router.post('/me/password', authenticate, validate(changePasswordSchema), ctrl.changePassword);
router.delete('/me',        authenticate,             ctrl.deleteAccount);
router.patch('/me/notifications', authenticate,       ctrl.updateNotificationSettings);

export default router;
