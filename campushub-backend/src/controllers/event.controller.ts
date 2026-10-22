// src/controllers/event.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { notificationService } from '../services/notification.service';

export const listEvents = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category as string | undefined;
    const upcoming = req.query.upcoming !== 'false';
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      isPublished: true,
      ...(upcoming && { startTime: { gte: new Date() } }),
      ...(category && category !== 'ALL' && { category: category as never }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [events, total] = await prisma.$transaction([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startTime: 'asc' },
        include: {
          organizer: { select: { id: true, name: true, avatarEmoji: true } },
          _count: { select: { rsvps: true } },
        },
      }),
      prisma.event.count({ where }),
    ]);

    // Attach user's RSVP status
    const userId = req.user?.userId;
    const enriched = userId
      ? await Promise.all(events.map(async (event) => {
          const rsvp = await prisma.eventRsvp.findUnique({
            where: { eventId_userId: { eventId: event.id, userId } },
          });
          return { ...event, userRsvp: rsvp?.status || null };
        }))
      : events;

    sendPaginated(res, enriched, total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id },
      include: {
        organizer: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true } },
        rsvps: {
          where: { status: 'GOING' },
          take: 10,
          include: { user: { select: { id: true, name: true, avatarEmoji: true } } },
        },
        _count: { select: { rsvps: true } },
      },
    });
    if (!event) throw new ApiError(404, 'Event not found');

    const userId = req.user?.userId;
    const userRsvp = userId
      ? await prisma.eventRsvp.findUnique({ where: { eventId_userId: { eventId: event.id, userId } } })
      : null;

    sendSuccess(res, { ...event, userRsvp: userRsvp?.status || null });
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await prisma.event.create({
      data: { ...req.body, organizerId: req.user!.userId, tags: req.body.tags || [] },
      include: { organizer: { select: { id: true, name: true } } },
    });
    sendCreated(res, event, 'Event created');
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized');
    }
    const updated = await prisma.event.update({ where: { id: req.params.id }, data: req.body });
    sendSuccess(res, updated, 'Event updated');
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) throw new ApiError(404, 'Event not found');
    if (event.organizerId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Not authorized');
    }
    await prisma.event.delete({ where: { id: req.params.id } });
    sendSuccess(res, null, 'Event deleted');
  } catch (err) {
    next(err);
  }
};

export const rsvpEvent = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { status = 'GOING' } = req.body;

    const event = await prisma.event.findUnique({ where: { id } });
    if (!event) throw new ApiError(404, 'Event not found');

    if (event.maxAttendees) {
      const goingCount = await prisma.eventRsvp.count({ where: { eventId: id, status: 'GOING' } });
      if (goingCount >= event.maxAttendees && status === 'GOING') {
        throw new ApiError(400, 'This event is at full capacity');
      }
    }

    const rsvp = await prisma.eventRsvp.upsert({
      where: { eventId_userId: { eventId: id, userId } },
      create: { eventId: id, userId, status },
      update: { status },
    });

    if (status === 'GOING') {
      await notificationService.create({
        userId,
        type: 'RSVP_CONFIRMED',
        title: 'RSVP Confirmed 🎉',
        body: `You're going to "${event.title}"`,
        data: { eventId: id },
      });
    }

    sendSuccess(res, rsvp, `RSVP updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

export const cancelRsvp = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    await prisma.eventRsvp.deleteMany({ where: { eventId: id, userId } });
    sendSuccess(res, null, 'RSVP cancelled');
  } catch (err) {
    next(err);
  }
};
