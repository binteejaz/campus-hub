// src/routes/carpool.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/carpool.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createCarpoolSchema } from '../validators/schemas';

const router = Router();

router.get('/',                         optionalAuth, ctrl.listCarpools);
router.post('/',                        authenticate, validate(createCarpoolSchema), ctrl.createCarpool);
router.get('/:id',                      optionalAuth, ctrl.getCarpool);
router.put('/:id',                      authenticate, ctrl.updateCarpool);
router.delete('/:id',                   authenticate, ctrl.deleteCarpool);
router.post('/:id/request',             authenticate, ctrl.requestSeat);
router.patch('/:id/requests/:requestId', authenticate, ctrl.respondToRequest);

export default router;
