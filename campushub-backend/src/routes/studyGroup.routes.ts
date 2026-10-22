// src/routes/studyGroup.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/studyGroup.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createStudyGroupSchema, updateStudyGroupSchema } from '../validators/schemas';

const router = Router();

router.get('/',              optionalAuth,  ctrl.listStudyGroups);
router.post('/',             authenticate, validate(createStudyGroupSchema), ctrl.createStudyGroup);
router.get('/:id',           optionalAuth,  ctrl.getStudyGroup);
router.put('/:id',           authenticate, validate(updateStudyGroupSchema), ctrl.updateStudyGroup);
router.delete('/:id',        authenticate,  ctrl.deleteStudyGroup);
router.post('/:id/join',     authenticate,  ctrl.joinStudyGroup);
router.post('/:id/leave',    authenticate,  ctrl.leaveStudyGroup);
router.post('/:id/resources',authenticate,  ctrl.addResource);
router.delete('/:id/resources/:resourceId', authenticate, ctrl.removeResource);

export default router;
