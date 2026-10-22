// src/controllers/user.controller.ts
import { Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database';
import { sendSuccess } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';

export const getProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { username } = req.params;
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true, name: true, username: true, bio: true, avatarUrl: true,
        avatarEmoji: true, department: true, yearOfStudy: true, createdAt: true,
        _count: {
          select: { studyGroupMembers: true, eventRsvps: true, carpoolsPosted: true },
        },
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, bio, department, yearOfStudy, avatarEmoji } = req.body;

    const updated = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { name, bio, department, yearOfStudy, avatarEmoji },
      select: {
        id: true, name: true, username: true, bio: true, avatarUrl: true,
        avatarEmoji: true, department: true, yearOfStudy: true, email: true,
      },
    });

    sendSuccess(res, updated, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

export const changePassword = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    if (!user?.passwordHash) throw new ApiError(400, 'No password set (OAuth account)');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Current password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    // Invalidate all refresh tokens for security
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    sendSuccess(res, null, 'Password changed. Please log in again.');
  } catch (err) {
    next(err);
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { password } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new ApiError(404, 'User not found');

    if (user.passwordHash) {
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) throw new ApiError(401, 'Incorrect password');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false, email: `deleted_${user.id}@campushub.deleted` },
    });

    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    sendSuccess(res, null, 'Account deactivated');
  } catch (err) {
    next(err);
  }
};

export const updateNotificationSettings = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const settings = await prisma.notificationSettings.upsert({
      where: { userId: req.user!.userId },
      create: { userId: req.user!.userId, ...req.body },
      update: req.body,
    });
    sendSuccess(res, settings, 'Notification settings updated');
  } catch (err) {
    next(err);
  }
};
