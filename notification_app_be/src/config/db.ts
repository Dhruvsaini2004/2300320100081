import mongoose from 'mongoose';
import { Log } from 'logging-middleware';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/notification_platform';

export async function connectDB(): Promise<void> {
  try {
    await mongoose.connect(MONGO_URI);
    Log('backend', 'info', 'db', 'Database connected');
  } catch (err: any) {
    Log('backend', 'fatal', 'db', `DB connection failed: ${err.message}`);
    process.exit(1);
  }
}

mongoose.connection.on('error', (err) => {
  Log('backend', 'error', 'db', err.message);
});
