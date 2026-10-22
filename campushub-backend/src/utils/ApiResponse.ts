// src/utils/ApiResponse.ts
import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  data: unknown,
  message = 'Success',
  statusCode = 200
): Response => {
  return res.status(statusCode).json({ success: true, message, data });
};

export const sendCreated = (res: Response, data: unknown, message = 'Created'): Response => {
  return sendSuccess(res, data, message, 201);
};

export const sendPaginated = (
  res: Response,
  data: unknown[],
  total: number,
  page: number,
  limit: number,
  message = 'Success'
): Response => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  });
};
