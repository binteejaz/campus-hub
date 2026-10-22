// src/controllers/search.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const globalSearch = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) throw new ApiError(400, 'Search query must be at least 2 characters');

    const query = { contains: q, mode: 'insensitive' as const };

    const [studyGroups, events, lostFound, carpools, users, chatRooms] = await Promise.all([
      prisma.studyGroup.findMany({
        where: { isPublic: true, OR: [{ title: query }, { subject: query }] },
        take: 5,
        select: { id: true, title: true, subject: true, _count: { select: { members: true } } },
      }),
      prisma.event.findMany({
        where: { isPublished: true, OR: [{ title: query }, { description: query }] },
        take: 5,
        select: { id: true, title: true, startTime: true, category: true },
      }),
      prisma.lostFoundItem.findMany({
        where: { status: { not: 'RESOLVED' }, OR: [{ title: query }, { description: query }] },
        take: 5,
        select: { id: true, title: true, status: true, category: true },
      }),
      prisma.carpool.findMany({
        where: { isActive: true, OR: [{ origin: query }, { destination: query }] },
        take: 5,
        select: { id: true, origin: true, destination: true, type: true, departureTime: true },
      }),
      prisma.user.findMany({
        where: { isActive: true, OR: [{ name: query }, { username: query }] },
        take: 5,
        select: { id: true, name: true, username: true, avatarEmoji: true, department: true },
      }),
      prisma.chatRoom.findMany({
        where: { isPrivate: false, OR: [{ name: query }, { description: query }] },
        take: 5,
        select: { id: true, name: true, slug: true, emoji: true, _count: { select: { members: true } } },
      }),
    ]);

    const totalResults = studyGroups.length + events.length + lostFound.length + carpools.length + users.length + chatRooms.length;

    sendSuccess(res, {
      query: q,
      totalResults,
      results: { studyGroups, events, lostFound, carpools, users, chatRooms },
    });
  } catch (err) {
    next(err);
  }
};
