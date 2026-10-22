// src/routes/chat.routes.ts
import { Router } from 'express';
import * as ctrl from '../controllers/chat.controller';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createChatRoomSchema } from '../validators/schemas';

const router = Router();

// Room management
router.get('/rooms/mine',        authenticate, ctrl.listRooms);
router.get('/rooms/explore',     optionalAuth, ctrl.exploreRooms);
router.post('/rooms',            authenticate, validate(createChatRoomSchema), ctrl.createRoom);
router.get('/rooms/:id',         optionalAuth, ctrl.getRoom);
router.post('/rooms/:id/join',   authenticate, ctrl.joinRoom);
router.post('/rooms/:id/leave',  authenticate, ctrl.leaveRoom);

// Messages (REST fallback — real-time via Socket.io)
router.get('/rooms/:id/messages',    authenticate, ctrl.getMessages);
router.post('/rooms/:id/messages',   authenticate, ctrl.sendMessage);
router.delete('/messages/:messageId', authenticate, ctrl.deleteMessage);

export default router;
