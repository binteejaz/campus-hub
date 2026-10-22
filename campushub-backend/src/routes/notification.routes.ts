// src/routes/notification.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/',              authenticate, ctrl.listNotifications);
router.patch('/:id/read',    authenticate, ctrl.markRead);
router.post('/read-all',     authenticate, ctrl.markAllRead);
router.delete('/:id',        authenticate, ctrl.deleteNotification);
router.delete('/',           authenticate, ctrl.clearAll);

export default router;
