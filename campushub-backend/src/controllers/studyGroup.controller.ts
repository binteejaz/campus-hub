// src/controllers/studyGroup.controller.ts
import { Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { sendSuccess, sendCreated, sendPaginated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

// ─── List Study Groups ────────────────────────────────────────
export const listStudyGroups = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const subject = req.query.subject as string | undefined;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    const where = {
      isPublic: true,
      ...(subject && subject !== 'All' && { subject }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { subject: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [groups, total] = await prisma.$transaction([
      prisma.studyGroup.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: { select: { id: true, name: true, avatarEmoji: true } },
          _count: { select: { members: true, resources: true } },
          members: {
            take: 5,
            select: { user: { select: { id: true, name: true, avatarEmoji: true } } },
          },
        },
      }),
      prisma.studyGroup.count({ where }),
    ]);

    // Attach "isMember" flag if authenticated
    const userId = req.user?.userId;
    const enriched = userId
      ? await Promise.all(
          groups.map(async (g) => {
            const membership = await prisma.studyGroupMember.findUnique({
              where: { studyGroupId_userId: { studyGroupId: g.id, userId } },
            });
            return { ...g, isMember: !!membership };
          })
        )
      : groups;

    sendPaginated(res, enriched, total, page, limit);
  } catch (err) {
    next(err);
  }
};

// ─── Get Single Study Group ───────────────────────────────────
export const getStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;

    const group = await prisma.studyGroup.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true } },
        members: {
          include: { user: { select: { id: true, name: true, avatarEmoji: true, avatarUrl: true, department: true } } },
          orderBy: { joinedAt: 'asc' },
        },
        resources: { orderBy: { createdAt: 'desc' } },
        _count: { select: { members: true } },
      },
    });

    if (!group) throw new ApiError(404, 'Study group not found');

    const userId = req.user?.userId;
    const isMember = userId ? group.members.some((m) => m.userId === userId) : false;
    const isOwner = userId === group.ownerId;

    sendSuccess(res, { ...group, isMember, isOwner });
  } catch (err) {
    next(err);
  }
};

// ─── Create Study Group ───────────────────────────────────────
export const createStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { title, subject, description, tags, maxMembers, isPublic, meetingLink, location, schedule, coverColor } = req.body;

    const group = await prisma.studyGroup.create({
      data: {
        ownerId: userId, title, subject, description,
        tags: tags || [], maxMembers: maxMembers || 10,
        isPublic: isPublic ?? true, meetingLink, location, schedule, coverColor,
        members: { create: { userId, isAdmin: true } }, // owner auto-joins as admin
      },
      include: {
        owner: { select: { id: true, name: true, avatarEmoji: true } },
        _count: { select: { members: true } },
      },
    });

    await cache.delPattern('studyGroups:*');
    sendCreated(res, group, 'Study group created');
  } catch (err) {
    next(err);
  }
};

// ─── Update Study Group ───────────────────────────────────────
export const updateStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.studyGroup.findUnique({ where: { id } });
    if (!group) throw new ApiError(404, 'Study group not found');
    if (group.ownerId !== userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only the owner can edit this group');
    }

    const updated = await prisma.studyGroup.update({
      where: { id },
      data: req.body,
    });

    await cache.del(`studyGroup:${id}`);
    sendSuccess(res, updated, 'Study group updated');
  } catch (err) {
    next(err);
  }
};

// ─── Delete Study Group ───────────────────────────────────────
export const deleteStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.studyGroup.findUnique({ where: { id } });
    if (!group) throw new ApiError(404, 'Study group not found');
    if (group.ownerId !== userId && req.user!.role !== 'ADMIN') {
      throw new ApiError(403, 'Only the owner can delete this group');
    }

    await prisma.studyGroup.delete({ where: { id } });
    await cache.delPattern('studyGroups:*');
    sendSuccess(res, null, 'Study group deleted');
  } catch (err) {
    next(err);
  }
};

// ─── Join Study Group ─────────────────────────────────────────
export const joinStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.studyGroup.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!group) throw new ApiError(404, 'Study group not found');

    const existing = await prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (existing) throw new ApiError(409, 'Already a member of this group');

    if (group._count.members >= group.maxMembers) {
      throw new ApiError(400, 'This study group is full');
    }

    await prisma.studyGroupMember.create({ data: { studyGroupId: id, userId } });
    sendSuccess(res, null, 'Joined study group');
  } catch (err) {
    next(err);
  }
};

// ─── Leave Study Group ────────────────────────────────────────
export const leaveStudyGroup = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.studyGroup.findUnique({ where: { id } });
    if (!group) throw new ApiError(404, 'Study group not found');
    if (group.ownerId === userId) throw new ApiError(400, 'Owner cannot leave. Transfer ownership or delete the group.');

    await prisma.studyGroupMember.delete({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });

    sendSuccess(res, null, 'Left study group');
  } catch (err) {
    next(err);
  }
};

// ─── Add Resource ─────────────────────────────────────────────
export const addResource = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { title, url, type } = req.body;

    const member = await prisma.studyGroupMember.findUnique({
      where: { studyGroupId_userId: { studyGroupId: id, userId } },
    });
    if (!member) throw new ApiError(403, 'Must be a member to add resources');

    const resource = await prisma.studyResource.create({
      data: { studyGroupId: id, uploadedById: userId, title, url, type: type || 'link' },
    });

    sendCreated(res, resource, 'Resource added');
  } catch (err) {
    next(err);
  }
};

// ─── Remove Resource ──────────────────────────────────────────
export const removeResource = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id, resourceId } = req.params;
    const userId = req.user!.userId;

    const group = await prisma.studyGroup.findUnique({ where: { id } });
    const resource = await prisma.studyResource.findUnique({ where: { id: resourceId } });

    if (!resource) throw new ApiError(404, 'Resource not found');
    if (resource.uploadedById !== userId && group?.ownerId !== userId) {
      throw new ApiError(403, 'Cannot remove this resource');
    }

    await prisma.studyResource.delete({ where: { id: resourceId } });
    sendSuccess(res, null, 'Resource removed');
  } catch (err) {
    next(err);
  }
};
