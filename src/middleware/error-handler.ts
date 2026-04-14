import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { InvalidTransitionError } from '../services/asset-service.js';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof InvalidTransitionError) {
    res.status(409).json({ error: err.message });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({ error: 'Internal server error' });
}
