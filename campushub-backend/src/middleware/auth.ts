// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../config/jwt';
import { prisma } from '../config/database';
import { ApiError } from '../utils/ApiError';

export interface AuthRequest extends Request {
  user?: JwtPayload & { name: string };
}

/**
 * Verifies the Bearer JWT and attaches `req.user`
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new ApiError(401, 'No authentication token provided');
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, name: true, isActive: true },
    });

    if (!user || !user.isActive) {
      throw new ApiError(401, 'User account not found or deactivated');
    }

    req.user = { ...payload, name: user.name };
    next();
  } catch (err) {
    if (err instanceof ApiError) return next(err);
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

/**
 * Optional auth — attaches user if token present, proceeds either way
 */
export const optionalAuth = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  return authenticate(req, _res, next);
};

/**
 * Role-based access guard — use after `authenticate`
 */
export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
};
