import { Router } from 'express';

export const healthRouter = Router();
healthRouter.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});
