// src/config/passport.ts
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { prisma } from './database';
import { logger } from './logger';

export const initPassport = (): void => {
  // ─── JWT Strategy ──────────────────────────────────────────
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET!,
      },
      async (payload, done) => {
        try {
          const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, role: true, isActive: true },
          });
          if (!user || !user.isActive) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err, false);
        }
      }
    )
  );

  // ─── Google OAuth Strategy ────────────────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
        },
        async (_accessToken, _refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) return done(new Error('No email from Google'), false);

            // Check if OAuth account already exists
            let oauthAccount = await prisma.oAuthAccount.findUnique({
              where: { provider_providerId: { provider: 'google', providerId: profile.id } },
              include: { user: true },
            });

            if (oauthAccount) {
              return done(null, oauthAccount.user);
            }

            // Check if user exists with same email
            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
              // Create new user
              const baseName = profile.displayName || email.split('@')[0];
              const baseUsername = baseName.toLowerCase().replace(/\s+/g, '');
              let username = baseUsername;
              let suffix = 1;
              while (await prisma.user.findUnique({ where: { username } })) {
                username = `${baseUsername}${suffix++}`;
              }

              user = await prisma.user.create({
                data: {
                  email,
                  name: baseName,
                  username,
                  avatarUrl: profile.photos?.[0]?.value,
                  isEmailVerified: true,
                  notificationSettings: { create: {} },
                },
              });
            }

            // Link OAuth account
            await prisma.oAuthAccount.create({
              data: {
                userId: user.id,
                provider: 'google',
                providerId: profile.id,
                accessToken: _accessToken,
                refreshToken: _refreshToken ?? undefined,
              },
            });

            logger.info(`Google OAuth login: ${email}`);
            return done(null, user);
          } catch (err) {
            return done(err as Error, false);
          }
        }
      )
    );
  } else {
    logger.warn('Google OAuth credentials not set — Google login disabled');
  }
};
