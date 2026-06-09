import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { Log } from 'logging-middleware';
import { connectDB } from './config/db';
import notificationRoutes from './routes/notifications';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  Log('backend', 'info', 'middleware', `${req.method} ${req.url}`);
  next();
});

app.use('/notifications', notificationRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

import { syncNotifications } from './services/notificationService';

app.listen(port, () => {
  Log('backend', 'info', 'middleware', `running on ${port}`);
  connectDB();
  syncNotifications().catch((err: any) => {
    Log('backend', 'error', 'service', `Initial startup sync failed: ${err.message}`);
  });
});
