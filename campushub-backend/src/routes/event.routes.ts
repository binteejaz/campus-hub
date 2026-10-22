// src/routes/event.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/event.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createEventSchema } from '../validators/schemas';

const router = Router();

router.get('/',                  optionalAuth, ctrl.listEvents);
router.post('/',                 authenticate, validate(createEventSchema), ctrl.createEvent);
router.get('/:id',               optionalAuth, ctrl.getEvent);
router.put('/:id',               authenticate, ctrl.updateEvent);
router.delete('/:id',            authenticate, ctrl.deleteEvent);
router.post('/:id/rsvp',         authenticate, ctrl.rsvpEvent);
router.delete('/:id/rsvp',       authenticate, ctrl.cancelRsvp);

export default router;
