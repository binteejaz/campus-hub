// src/controllers/notification.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendPaginated } from '../utils/ApiResponse';
import { AuthRequest } from '../middleware/auth';

export const listNotifications = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const unreadOnly = req.query.unread === 'true';
    const skip = (page - 1) * limit;

    const where = { userId, ...(unreadOnly && { isRead: false }) };

    const [notifications, total] = await prisma.$transaction([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
    ]);

    const unreadCount = await prisma.notification.count({ where: { userId, isRead: false } });

    sendPaginated(res, notifications, total, page, limit, `${unreadCount} unread`);
  } catch (err) {
    next(err);
  }
};

export const markRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({
      where: { id, userId: req.user!.userId },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'Marked as read');
  } catch (err) {
    next(err);
  }
};

export const markAllRead = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.userId, isRead: false },
      data: { isRead: true },
    });
    sendSuccess(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

export const deleteNotification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.deleteMany({
      where: { id: req.params.id, userId: req.user!.userId },
    });
    sendSuccess(res, null, 'Notification deleted');
  } catch (err) {
    next(err);
  }
};

export const clearAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user!.userId } });
    sendSuccess(res, null, 'All notifications cleared');
  } catch (err) {
    next(err);
  }
};
