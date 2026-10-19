import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FALLBACK_PORT = Number(process.env.FALLBACK_PORT || 5001);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mockinterview';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Mock Interview API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected');

    const listenOnPort = (port, retryWithFallback = true) => {
      const server = app.listen(port, () => console.log(`Server running on port ${port}`));
      server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          const nextPort = FALLBACK_PORT !== port ? FALLBACK_PORT : port + 1;
          if (retryWithFallback && nextPort !== port) {
            console.warn(`Port ${port} is busy. Retrying on ${nextPort}...`);
            listenOnPort(nextPort, false);
          } else {
            console.error(`Port ${port} is already in use by another process. Please stop the existing process or specify another PORT.`);
            process.exit(1);
          }
        } else {
          console.error('Server start error:', error);
          process.exit(1);
        }
      });
    };

    listenOnPort(PORT);
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

startServer();
