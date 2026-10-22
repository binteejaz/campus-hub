// src/controllers/carpool.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const listCarpools = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const type = req.query.type as string | undefined;
    const origin = req.query.origin as string | undefined;
    const destination = req.query.destination as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      isActive: true,
      departureTime: { gte: new Date() },
      ...(type && { type: type as 'OFFERING' | 'LOOKING' }),
      ...(origin && { origin: { contains: origin, mode: 'insensitive' as const } }),
      ...(destination && { destination: { contains: destination, mode: 'insensitive' as const } }),
    };

    const [carpools, total] = await prisma.$transaction([
      prisma.carpool.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureTime: 'asc' },
        include: {
          driver: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true, department: true } },
          _count: { select: { requests: true } },
        },
      }),
      prisma.carpool.count({ where }),
    ]);

    sendPaginated(res, carpools, total, page, limit);
  } catch (err) {
    next(err);
  }
};

export const getCarpool = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const carpool = await prisma.carpool.findUnique({
      where: { id: req.params.id },
      include: {
        driver: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true, department: true, yearOfStudy: true } },
        requests: {
          include: { requester: { select: { id: true, name: true, avatarEmoji: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!carpool) throw new ApiError(404, 'Carpool not found');
    sendSuccess(res, carpool);
  } catch (err) {
    next(err);
  }
};

export const createCarpool = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { seatsTotal, ...rest } = req.body;

    const carpool = await prisma.carpool.create({
      data: { ...rest, driverId: userId, seatsTotal, seatsLeft: seatsTotal },
      include: { driver: { select: { id: true, name: true, avatarEmoji: true } } },
    });

    sendCreated(res, carpool, 'Carpool posted');
  } catch (err) {
    next(err);
  }
};

export const updateCarpool = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const carpool = await prisma.carpool.findUnique({ where: { id } });
    if (!carpool) throw new ApiError(404, 'Carpool not found');
    if (carpool.driverId !== userId) throw new ApiError(403, 'Only the driver can edit this');

    const updated = await prisma.carpool.update({ where: { id }, data: req.body });
    sendSuccess(res, updated, 'Carpool updated');
  } catch (err) {
    next(err);
  }
};

export const deleteCarpool = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const carpool = await prisma.carpool.findUnique({ where: { id } });
    if (!carpool) throw new ApiError(404, 'Carpool not found');
    if (carpool.driverId !== userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only the driver can delete this');
    }

    await prisma.carpool.delete({ where: { id } });
    sendSuccess(res, null, 'Carpool deleted');
  } catch (err) {
    next(err);
  }
};

export const requestSeat = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { seats = 1, message } = req.body;

    const carpool = await prisma.carpool.findUnique({ where: { id } });
    if (!carpool) throw new ApiError(404, 'Carpool not found');
    if (carpool.driverId === userId) throw new ApiError(400, 'Cannot request your own carpool');
    if (carpool.seatsLeft < seats) throw new ApiError(400, `Only ${carpool.seatsLeft} seat(s) available`);

    const existing = await prisma.carpoolRequest.findUnique({
      where: { carpoolId_requesterId: { carpoolId: id, requesterId: userId } },
    });
    if (existing) throw new ApiError(409, 'Already requested this carpool');

    const request = await prisma.carpoolRequest.create({
      data: { carpoolId: id, requesterId: userId, seats, message },
    });

    sendCreated(res, request, 'Seat request sent');
  } catch (err) {
    next(err);
  }
};

export const respondToRequest = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, requestId } = req.params;
    const { status } = req.body; // APPROVED | REJECTED
    const userId = req.user!.userId;

    const carpool = await prisma.carpool.findUnique({ where: { id } });
    if (!carpool || carpool.driverId !== userId) throw new ApiError(403, 'Not authorized');

    const request = await prisma.carpoolRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new ApiError(404, 'Request not found');

    const updated = await prisma.carpoolRequest.update({
      where: { id: requestId },
      data: { status },
    });

    if (status === 'APPROVED') {
      await prisma.carpool.update({
        where: { id },
        data: { seatsLeft: { decrement: request.seats } },
      });
    }

    sendSuccess(res, updated, `Request ${status.toLowerCase()}`);
  } catch (err) {
    next(err);
  }
};
