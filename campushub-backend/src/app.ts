// src/app.ts
import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import path from 'path';

import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Route imports
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import studyGroupRoutes from './routes/studyGroup.routes';
import carpoolRoutes from './routes/carpool.routes';
import lostFoundRoutes from './routes/lostFound.routes';
import eventRoutes from './routes/event.routes';
import chatRoutes from './routes/chat.routes';
import notificationRoutes from './routes/notification.routes';
import searchRoutes from './routes/search.routes';
import uploadRoutes from './routes/upload.routes';

const app: Application = express();

// ─── Security Headers ─────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Handled by reverse proxy in production
}));

// ─── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Global Rate Limiter ───────────────────────────────────────
app.use(rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
}));

// ─── Body Parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ─── HTTP Logging ──────────────────────────────────────────────
app.use(morgan('combined', {
  stream: { write: (msg) => logger.http(msg.trim()) },
  skip: (req) => req.path === '/health',
}));

// ─── Static Files (uploads) ───────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'CampusHub API is healthy',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
});

// ─── API Routes ───────────────────────────────────────────────
const API = '/api';

app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/users`,         userRoutes);
app.use(`${API}/study-groups`,  studyGroupRoutes);
app.use(`${API}/carpools`,      carpoolRoutes);
app.use(`${API}/lost-found`,    lostFoundRoutes);
app.use(`${API}/events`,        eventRoutes);
app.use(`${API}/chat`,          chatRoutes);
app.use(`${API}/notifications`, notificationRoutes);
app.use(`${API}/search`,        searchRoutes);
app.use(`${API}/upload`,        uploadRoutes);

// ─── Error Handling ───────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

export default app;
