import express from 'express';
import { healthRouter } from './routes/health.route.js';
import { errorHandler } from './middleware/error.middleware.js';

export const app = express();
app.use(express.json());
app.use('/api', healthRouter);
app.use(errorHandler);
