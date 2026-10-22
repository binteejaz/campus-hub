// src/routes/upload.routes.ts
import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendCreated } from '../utils/ApiResponse';
import { ApiError } from '../utils/ApiError';

const router = Router();

const ALLOWED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'],
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (req, file, cb) => {
  const allowed = [...ALLOWED_TYPES.image, ...ALLOWED_TYPES.document];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: (Number(process.env.MAX_FILE_SIZE_MB) || 5) * 1024 * 1024 },
});

router.post(
  '/image',
  authenticate,
  upload.single('file'),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));
    const url = `/uploads/${req.file.filename}`;
    sendCreated(res, { url, filename: req.file.filename, size: req.file.size }, 'File uploaded');
  }
);

router.post(
  '/avatar',
  authenticate,
  upload.single('avatar'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.file) return next(new ApiError(400, 'No file uploaded'));
    if (!ALLOWED_TYPES.image.includes(req.file.mimetype)) {
      return next(new ApiError(400, 'Only image files allowed for avatars'));
    }
    const { prisma } = await import('../config/database');
    const url = `/uploads/${req.file.filename}`;
    const user = await prisma.user.update({
      where: { id: req.user!.userId },
      data: { avatarUrl: url },
      select: { id: true, avatarUrl: true },
    });
    sendCreated(res, user, 'Avatar updated');
  }
);

export default router;
