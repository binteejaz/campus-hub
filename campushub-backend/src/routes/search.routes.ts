// src/routes/search.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/search.controller';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, ctrl.globalSearch);

export default router;
