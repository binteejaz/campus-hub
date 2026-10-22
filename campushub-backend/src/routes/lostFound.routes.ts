// src/routes/lostFound.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/lostFound.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createLostFoundSchema } from '../validators/schemas';

const router = Router();

router.get('/',                  optionalAuth, ctrl.listItems);
router.post('/',                 authenticate, validate(createLostFoundSchema), ctrl.createItem);
router.get('/:id',               optionalAuth, ctrl.getItem);
router.put('/:id',               authenticate, ctrl.updateItem);
router.patch('/:id/resolve',     authenticate, ctrl.markResolved);
router.delete('/:id',            authenticate, ctrl.deleteItem);

export default router;
