import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { Log } from 'logging-middleware';
import { connectDB } from './config/db';
import notificationRoutes from './routes/notifications';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, _res, next) => {
  Log('backend', 'info', 'middleware', `${req.method} ${req.originalUrl}`);
  next();
});

app.use('/notifications', notificationRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

connectDB().then(() => {
  app.listen(PORT, () => {
    Log('backend', 'info', 'middleware', `Server running on port ${PORT}`);
  });
});
