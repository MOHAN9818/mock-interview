import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import dns from 'node:dns';
import authRoutes from './routes/authRoutes.js';
import interviewRoutes from './routes/interviewRoutes.js';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 5000);
const FALLBACK_PORT = Number(process.env.FALLBACK_PORT || 5001);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mockinterview';

// Set public DNS servers for mongodb+srv resolution on networks where local DNS refuses SRV queries (querySrv ECONNREFUSED)
if (process.env.DNS_SERVERS) {
  try {
    dns.setServers(process.env.DNS_SERVERS.split(',').map((s) => s.trim()));
  } catch (dnsErr) {
    console.warn('Warning: Could not apply DNS_SERVERS setting:', dnsErr.message);
  }
} else if (MONGO_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // If not permitted in current environment, proceed with system defaults
  }
}

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Mock Interview API is running' });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'AI Mock Interview API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);

const startServer = async () => {
  try {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('MongoDB connected');
    } catch (connErr) {
      if (
        MONGO_URI.startsWith('mongodb+srv://') &&
        (connErr.code === 'ECONNREFUSED' || connErr.syscall === 'querySrv' || connErr.message?.includes('querySrv'))
      ) {
        console.warn('SRV resolution failed with system resolver. Retrying with fallback DNS (8.8.8.8, 1.1.1.1)...');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected');
      } else {
        throw connErr;
      }
    }

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
    if (err.message && err.message.includes('SSL') && process.platform === 'win32') {
      console.error('\nTip: On Windows, start the server using "npm start" or pass --use-system-ca to node:');
      console.error('  node --use-system-ca src/server.js\n');
    }
    process.exit(1);
  }
};

startServer();
