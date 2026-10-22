// src/middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.slice(1).join('.'),
          message: e.message,
        }));
        next(new ApiError(422, 'Validation failed', errors));
      } else {
        next(err);
      }
    }
  };
};
