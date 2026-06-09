import mongoose from 'mongoose';
import { Log } from 'logging-middleware';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notification_platform';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    Log('backend', 'info', 'db', 'Database connected');
  } catch (err: any) {
    Log('backend', 'error', 'db', `Database connection error: ${err.message}`);
    Log('backend', 'fatal', 'db', `DB connection failed: ${err.message}`);
    // Do not call process.exit(1) so the express server can still boot up on port 4000
  }
}

mongoose.connection.on('error', (err) => {
  Log('backend', 'error', 'db', err.message);
});
