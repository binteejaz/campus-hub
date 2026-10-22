// src/config/jwt.ts
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from './database';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export const signAccessToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as SignOptions);
};

export const signRefreshToken = (): string => {
  return uuidv4(); // opaque random token stored in DB
};

export const verifyAccessToken = (token: string): JwtPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
};

export const issueTokenPair = async (
  userId: string,
  email: string,
  role: string,
  meta?: { userAgent?: string; ipAddress?: string }
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> => {
  const accessToken = signAccessToken({ userId, email, role });
  const refreshToken = signRefreshToken();

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  await prisma.refreshToken.create({
    data: {
      userId,
      token: refreshToken,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });

  return { accessToken, refreshToken, expiresIn: 15 * 60 }; // seconds
};
