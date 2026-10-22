// src/controllers/chat.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

// ─── Rooms ────────────────────────────────────────────────────

export const listRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const memberships = await prisma.chatMember.findMany({
      where: { userId },
      include: {
        room: {
          include: {
            _count: { select: { members: true, messages: true } },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              include: { sender: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: { room: { updatedAt: 'desc' } },
    });

    const rooms = memberships.map((m) => ({
      ...m.room,
      lastMessage: m.room.messages[0] || null,
      unreadCount: 0, // TODO: implement with lastReadAt comparison
      isAdmin: m.isAdmin,
      isMuted: m.isMuted,
    }));

    sendSuccess(res, rooms);
  } catch (err) {
    next(err);
  }
};

export const exploreRooms = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      isPrivate: false,
      isDirectMsg: false,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [rooms, total] = await prisma.$transaction([
      prisma.chatRoom.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { members: true } },
          owner: { select: { id: true, name: true } },
        },
      }),
      prisma.chatRoom.count({ where }),
    ]);

    const userId = req.user?.userId;
    const enriched = userId
      ? await Promise.all(rooms.map(async (room) => {
          const member = await prisma.chatMember.findUnique({
            where: { roomId_userId: { roomId: room.id, userId } },
          });
          return { ...room, isMember: !!member };
        }))
      : rooms;

    sendPaginated(res, enriched, total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const room = await prisma.chatRoom.findFirst({
      where: { OR: [{ id: req.params.id }, { slug: req.params.id }] },
      include: {
        owner: { select: { id: true, name: true } },
        _count: { select: { members: true } },
        members: {
          take: 20,
          include: { user: { select: { id: true, name: true, avatarEmoji: true, lastSeenAt: true } } },
        },
      },
    });
    if (!room) throw new ApiError(404, 'Room not found');
    sendSuccess(res, room);
  } catch (err) {
    next(err);
  }
};

export const createRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const existing = await prisma.chatRoom.findUnique({ where: { slug: req.body.slug } });
    if (existing) throw new ApiError(409, 'A room with this slug already exists');

    const room = await prisma.chatRoom.create({
      data: {
        ...req.body,
        ownerId: userId,
        members: { create: { userId, isAdmin: true } },
      },
    });

    sendCreated(res, room, 'Chat room created');
  } catch (err) {
    next(err);
  }
};

export const joinRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const room = await prisma.chatRoom.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, 'Room not found');
    if (room.isPrivate) throw new ApiError(403, 'This is a private room');

    const existing = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId: id, userId } },
    });
    if (existing) throw new ApiError(409, 'Already a member');

    await prisma.chatMember.create({ data: { roomId: id, userId } });

    // System message
    await prisma.message.create({
      data: {
        roomId: id,
        senderId: userId,
        content: `joined the room`,
        type: 'SYSTEM',
      },
    });

    sendSuccess(res, null, 'Joined room');
  } catch (err) {
    next(err);
  }
};

export const leaveRoom = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const room = await prisma.chatRoom.findUnique({ where: { id } });
    if (!room) throw new ApiError(404, 'Room not found');
    if (room.ownerId === userId) throw new ApiError(400, 'Owner cannot leave. Transfer ownership or delete the room.');

    await prisma.chatMember.delete({ where: { roomId_userId: { roomId: id, userId } } });
    sendSuccess(res, null, 'Left room');
  } catch (err) {
    next(err);
  }
};

// ─── Messages ─────────────────────────────────────────────────

export const getMessages = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Verify membership
    const member = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ApiError(403, 'Must be a member to view messages');

    const [messages, total] = await prisma.$transaction([
      prisma.message.findMany({
        where: { roomId, deletedAt: null },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }, // newest first for cursor pagination
        include: {
          sender: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true } },
          replyTo: {
            include: { sender: { select: { id: true, name: true } } },
          },
        },
      }),
      prisma.message.count({ where: { roomId } }),
    ]);

    // Update read cursor
    await prisma.chatMember.update({
      where: { roomId_userId: { roomId, userId } },
      data: { lastReadAt: new Date() },
    });

    sendPaginated(res, messages.reverse(), total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const sendMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id: roomId } = req.params;
    const userId = req.user!.userId;
    const { content, replyToId } = req.body;

    const member = await prisma.chatMember.findUnique({
      where: { roomId_userId: { roomId, userId } },
    });
    if (!member) throw new ApiError(403, 'Must be a member to send messages');
    if (member.isMuted) throw new ApiError(403, 'You are muted in this room');

    const message = await prisma.message.create({
      data: { roomId, senderId: userId, content: content.trim(), replyToId },
      include: {
        sender: { select: { id: true, name: true, avatarEmoji: true } },
        replyTo: { include: { sender: { select: { id: true, name: true } } } },
      },
    });

    await prisma.chatRoom.update({ where: { id: roomId }, data: { updatedAt: new Date() } });
    sendCreated(res, message, 'Message sent');
  } catch (err) {
    next(err);
  }
};

export const deleteMessage = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.userId;

    const message = await prisma.message.findUnique({ where: { id: messageId } });
    if (!message) throw new ApiError(404, 'Message not found');
    if (message.senderId !== userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Cannot delete this message');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: { deletedAt: new Date(), content: '[deleted]' },
    });

    sendSuccess(res, null, 'Message deleted');
  } catch (err) {
    next(err);
  }
};
