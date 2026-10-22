// src/config/socket.ts
import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from './database';
import { logger } from './logger';

let io: SocketServer;

interface AuthSocket extends Socket {
  userId?: string;
  userName?: string;
}

export const initSocket = (server: HttpServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: (process.env.CLIENT_URL || 'http://localhost:3000').split(','),
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ─── JWT Auth Middleware ──────────────────────────────────────
  io.use(async (socket: AuthSocket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('No auth token'));

      const payload = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, name: true, isActive: true },
      });

      if (!user || !user.isActive) return next(new Error('Unauthorized'));

      socket.userId = user.id;
      socket.userName = user.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  // ─── Connection Handler ──────────────────────────────────────
  io.on('connection', (socket: AuthSocket) => {
    const userId = socket.userId!;
    logger.debug(`Socket connected: ${userId} (${socket.id})`);

    // Auto-join user's personal notification room
    socket.join(`user:${userId}`);

    // Update last seen
    prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});

    // ── Join a chat room ────────────────────────────────────────
    socket.on('chat:join', async (roomId: string) => {
      // Verify membership
      const member = await prisma.chatMember.findUnique({
        where: { roomId_userId: { roomId, userId } },
      });
      if (!member) return socket.emit('error', { message: 'Not a member of this room' });

      socket.join(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('chat:userJoined', { userId, userName: socket.userName });
      logger.debug(`${socket.userName} joined room ${roomId}`);
    });

    // ── Leave a chat room ───────────────────────────────────────
    socket.on('chat:leave', (roomId: string) => {
      socket.leave(`room:${roomId}`);
      socket.to(`room:${roomId}`).emit('chat:userLeft', { userId, userName: socket.userName });
    });

    // ── Send a message ──────────────────────────────────────────
    socket.on('chat:message', async (data: { roomId: string; content: string; replyToId?: string }) => {
      try {
        const { roomId, content, replyToId } = data;

        // Verify membership
        const member = await prisma.chatMember.findUnique({
          where: { roomId_userId: { roomId, userId } },
        });
        if (!member || member.isMuted) return;

        const message = await prisma.message.create({
          data: { roomId, senderId: userId, content: content.trim(), replyToId },
          include: {
            sender: { select: { id: true, name: true, avatarUrl: true, avatarEmoji: true } },
            replyTo: { include: { sender: { select: { id: true, name: true } } } },
          },
        });

        // Broadcast to everyone in the room (including sender)
        io.to(`room:${roomId}`).emit('chat:message', message);

        // Update room's updatedAt
        await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
      } catch (err) {
        logger.error('Socket chat:message error:', err);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // ── Typing indicator ────────────────────────────────────────
    socket.on('chat:typing', (data: { roomId: string; isTyping: boolean }) => {
      socket.to(`room:${data.roomId}`).emit('chat:typing', {
        userId,
        userName: socket.userName,
        isTyping: data.isTyping,
      });
    });

    // ── Edit message ────────────────────────────────────────────
    socket.on('chat:editMessage', async (data: { messageId: string; content: string }) => {
      const msg = await prisma.message.findFirst({
        where: { id: data.messageId, senderId: userId },
      });
      if (!msg) return;

      const updated = await prisma.message.update({
        where: { id: data.messageId },
        data: { content: data.content, editedAt: new Date() },
      });
      io.to(`room:${msg.roomId}`).emit('chat:messageEdited', updated);
    });

    // ── Delete message ──────────────────────────────────────────
    socket.on('chat:deleteMessage', async (messageId: string) => {
      const msg = await prisma.message.findFirst({
        where: { id: messageId, senderId: userId },
      });
      if (!msg) return;

      await prisma.message.update({
        where: { id: messageId },
        data: { deletedAt: new Date(), content: '[deleted]' },
      });
      io.to(`room:${msg.roomId}`).emit('chat:messageDeleted', { messageId });
    });

    // ── Read receipt ────────────────────────────────────────────
    socket.on('chat:markRead', async (roomId: string) => {
      await prisma.chatMember.update({
        where: { roomId_userId: { roomId, userId } },
        data: { lastReadAt: new Date() },
      }).catch(() => {});
    });

    // ── Disconnect ──────────────────────────────────────────────
    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${userId} (${socket.id})`);
      prisma.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } }).catch(() => {});
    });
  });

  return io;
};

// Emit to a specific user (for notifications)
export const emitToUser = (userId: string, event: string, data: unknown): void => {
  io?.to(`user:${userId}`).emit(event, data);
};

// Emit to all members of a room
export const emitToRoom = (roomId: string, event: string, data: unknown): void => {
  io?.to(`room:${roomId}`).emit(event, data);
};

export const getIO = (): SocketServer => io;
