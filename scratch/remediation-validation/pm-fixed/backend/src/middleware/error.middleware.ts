import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  res.status(500).json({
    success: false,
    error: message,
  });
}
