// src/controllers/lostFound.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const listItems = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      ...(status && status !== 'ALL' ? { status: status as 'LOST' | 'FOUND' | 'RESOLVED' } : { status: { not: 'RESOLVED' as const } }),
      ...(category && { category }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { location: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await prisma.$transaction([
      prisma.lostFoundItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { id: true, name: true, avatarEmoji: true } } },
      }),
      prisma.lostFoundItem.count({ where }),
    ]);

    sendPaginated(res, items, total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await prisma.lostFoundItem.findUnique({
      where: { id: req.params.id },
      include: { reporter: { select: { id: true, name: true, avatarEmoji: true, department: true } } },
    });
    if (!item) throw new ApiError(404, 'Item not found');
    sendSuccess(res, item);
  } catch (err) {
    next(err);
  }
};

export const createItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await prisma.lostFoundItem.create({
      data: { ...req.body, reporterId: req.user!.userId },
      include: { reporter: { select: { id: true, name: true } } },
    });
    sendCreated(res, item, 'Item reported');
  } catch (err) {
    next(err);
  }
};

export const updateItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, 'Item not found');
    if (item.reporterId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized');
    }
    const updated = await prisma.lostFoundItem.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
};

export const markResolved = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, 'Item not found');
    if (item.reporterId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized');
    }
    const updated = await prisma.lostFoundItem.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    sendSuccess(res, updated, 'Item marked as resolved 🎉');
  } catch (err) {
    next(err);
  }
};

export const deleteItem = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const item = await prisma.lostFoundItem.findUnique({ where: { id: req.params.id } });
    if (!item) throw new ApiError(404, 'Item not found');
    if (item.reporterId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized');
    }
    await prisma.lostFoundItem.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Item deleted');
  } catch (err) {
    next(err);
  }
};
