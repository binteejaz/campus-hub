// src/controllers/auth.controller.ts
import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../config/database';
import { issueTokenPair, verifyAccessToken } from '../config/jwt';
import { sendSuccess, sendCreated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';
import { AuthRequest } from '../middleware/auth';
import { emailService } from '../services/email.service';
import { logger } from '../config/logger';

const SALT_ROUNDS = 12;

// ─── Register ─────────────────────────────────────────────────
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { firstName, lastName, email, password, department, yearOfStudy } = req.body;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) throw new ApiError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Generate a unique username from name
    const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '');
    let username = baseUsername;
    let suffix = 1;
    while (await prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${suffix++}`;
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `${firstName} ${lastName}`,
        username,
        department,
        yearOfStudy: yearOfStudy as never,
        notificationSettings: { create: {} },
      },
      select: { id: true, email: true, name: true, username: true, role: true, createdAt: true },
    });

    // Send email verification
    await sendVerificationEmail(user.id, email);

    const tokens = await issueTokenPair(user.id, user.email, user.role, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    logger.info(`New user registered: ${email}`);
    sendCreated(res, { user, ...tokens }, 'Account created successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Login ────────────────────────────────────────────────────
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, name: true, username: true,
        role: true, passwordHash: true, isActive: true,
        avatarUrl: true, avatarEmoji: true, department: true, yearOfStudy: true,
      },
    });

    if (!user || !user.passwordHash) {
      throw new ApiError(401, 'Invalid email or password');
    }
    if (!user.isActive) {
      throw new ApiError(403, 'Account has been deactivated. Contact support.');
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) throw new ApiError(401, 'Invalid email or password');

    const tokens = await issueTokenPair(user.id, user.email, user.role, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    // Update last seen
    await prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } });

    const { passwordHash: _, ...safeUser } = user;
    sendSuccess(res, { user: safeUser, ...tokens }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// ─── Refresh Token ────────────────────────────────────────────
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: { select: { id: true, email: true, role: true, isActive: true } } },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new ApiError(401, 'Invalid or expired refresh token');
    }
    if (!stored.user.isActive) throw new ApiError(403, 'Account deactivated');

    // Rotate: delete old, issue new pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const tokens = await issueTokenPair(stored.user.id, stored.user.email, stored.user.role, {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    sendSuccess(res, tokens, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

// ─── Logout ───────────────────────────────────────────────────
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    }
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Logout All Devices ───────────────────────────────────────
export const logoutAll = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await prisma.refreshToken.deleteMany({ where: { userId: req.user!.userId } });
    sendSuccess(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
};

// ─── Google OAuth Callback ────────────────────────────────────
export const googleCallback = async (req: Request, res: Response): Promise<void> => {
  // Passport attaches user to req.user
  const user = req.user as { id: string; email: string; role: string };
  const tokens = await issueTokenPair(user.id, user.email, user.role, {
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip,
  });
  // Redirect frontend with tokens in query (or use httpOnly cookie in production)
  const redirectUrl = `${process.env.CLIENT_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;
  res.redirect(redirectUrl);
};

// ─── Verify Email ─────────────────────────────────────────────
export const verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token } = req.params;

    const record = await prisma.emailVerification.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw new ApiError(400, 'Invalid or expired verification link');
    }

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { isEmailVerified: true } }),
      prisma.emailVerification.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    sendSuccess(res, null, 'Email verified successfully');
  } catch (err) {
    next(err);
  }
};

// ─── Resend Verification Email ────────────────────────────────
export const resendVerification = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    if (!user) throw new ApiError(404, 'User not found');
    if (user.isEmailVerified) throw new ApiError(400, 'Email already verified');

    await sendVerificationEmail(user.id, user.email);
    sendSuccess(res, null, 'Verification email sent');
  } catch (err) {
    next(err);
  }
};

// ─── Forgot Password ──────────────────────────────────────────
export const forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email } = req.body;

    // Always return success to prevent email enumeration
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordReset.create({ data: { userId: user.id, token, expiresAt } });
      await emailService.sendPasswordReset(email, user.name, token);
    }

    sendSuccess(res, null, 'If that email exists, a reset link has been sent');
  } catch (err) {
    next(err);
  }
};

// ─── Reset Password ───────────────────────────────────────────
export const resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { token, password } = req.body;

    const record = await prisma.passwordReset.findUnique({ where: { token } });
    if (!record || record.expiresAt < new Date() || record.usedAt) {
      throw new ApiError(400, 'Invalid or expired reset link');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Invalidate all refresh tokens for security
      prisma.refreshToken.deleteMany({ where: { userId: record.userId } }),
    ]);

    sendSuccess(res, null, 'Password reset successfully. Please log in.');
  } catch (err) {
    next(err);
  }
};

// ─── Me ───────────────────────────────────────────────────────
export const getMe = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true, email: true, name: true, username: true, bio: true,
        avatarUrl: true, avatarEmoji: true, department: true, yearOfStudy: true,
        role: true, isEmailVerified: true, createdAt: true, lastSeenAt: true,
        notificationSettings: true,
        _count: {
          select: {
            studyGroupMembers: true,
            eventRsvps: true,
            carpoolsPosted: true,
            messagesSent: true,
          },
        },
      },
    });
    if (!user) throw new ApiError(404, 'User not found');
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
};

// ─── Internal helpers ─────────────────────────────────────────
async function sendVerificationEmail(userId: string, email: string): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

  await prisma.emailVerification.create({ data: { userId, token, expiresAt } });
  await emailService.sendVerification(email, token);
}
