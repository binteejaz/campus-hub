// src/validators/schemas.ts
import { z } from 'zod';

// ─── Auth ─────────────────────────────────────────────────────

export const registerSchema = z.object({
  body: z.object({
    firstName: z.string().min(2).max(50),
    lastName: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8).max(100)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
    department: z.string().min(2).max(100).optional(),
    yearOfStudy: z.enum(['YEAR_1','YEAR_2','YEAR_3','YEAR_4','MASTERS','PHD','OTHER']).optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1),
    password: z.string().min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
  }),
});

// ─── Study Groups ─────────────────────────────────────────────

export const createStudyGroupSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(100),
    subject: z.string().min(2).max(100),
    description: z.string().max(500).optional(),
    tags: z.array(z.string()).max(8).optional(),
    maxMembers: z.number().int().min(2).max(50).optional(),
    isPublic: z.boolean().optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    location: z.string().max(200).optional(),
    schedule: z.string().max(200).optional(),
    coverColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

export const updateStudyGroupSchema = createStudyGroupSchema.partial();

// ─── Carpool ──────────────────────────────────────────────────

export const createCarpoolSchema = z.object({
  body: z.object({
    type: z.enum(['OFFERING', 'LOOKING']),
    origin: z.string().min(2).max(200),
    destination: z.string().min(2).max(200),
    originLat: z.number().optional(),
    originLng: z.number().optional(),
    destLat: z.number().optional(),
    destLng: z.number().optional(),
    departureTime: z.string().datetime(),
    seatsTotal: z.number().int().min(1).max(10),
    pricePerSeat: z.number().min(0).optional(),
    notes: z.string().max(300).optional(),
    recurringDays: z.array(z.string()).max(7).optional(),
  }),
});

// ─── Lost & Found ─────────────────────────────────────────────

export const createLostFoundSchema = z.object({
  body: z.object({
    status: z.enum(['LOST', 'FOUND']),
    title: z.string().min(3).max(100),
    description: z.string().max(500).optional(),
    category: z.string().min(2).max(50),
    location: z.string().max(200).optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    contactInfo: z.string().max(200).optional(),
    reward: z.string().max(100).optional(),
  }),
});

// ─── Events ───────────────────────────────────────────────────

export const createEventSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(150),
    description: z.string().max(2000).optional(),
    category: z.enum(['ACADEMIC','SOCIAL','SPORTS','WORKSHOP','CULTURAL','CAREER','OTHER']).optional(),
    location: z.string().max(200).optional(),
    locationLat: z.number().optional(),
    locationLng: z.number().optional(),
    startTime: z.string().datetime(),
    endTime: z.string().datetime().optional(),
    isOnline: z.boolean().optional(),
    meetingLink: z.string().url().optional().or(z.literal('')),
    maxAttendees: z.number().int().min(1).optional(),
    tags: z.array(z.string()).max(8).optional(),
  }),
});

// ─── Chat ─────────────────────────────────────────────────────

export const createChatRoomSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    description: z.string().max(300).optional(),
    slug: z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, hyphens'),
    emoji: z.string().max(4).optional(),
    isPrivate: z.boolean().optional(),
    accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  }),
});

// ─── Profile ──────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100).optional(),
    bio: z.string().max(300).optional(),
    department: z.string().max(100).optional(),
    yearOfStudy: z.enum(['YEAR_1','YEAR_2','YEAR_3','YEAR_4','MASTERS','PHD','OTHER']).optional(),
    avatarEmoji: z.string().max(4).optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
      .regex(/[A-Z]/, 'Must contain uppercase')
      .regex(/[0-9]/, 'Must contain number'),
  }),
});

// ─── Pagination ───────────────────────────────────────────────

export const paginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
});
