import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    System health check & database connection status
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbState = mongoose.connection.readyState;
  const isConfigured = Boolean(process.env.MONGODB_URI && process.env.MONGODB_URI.trim() !== '');

  res.status(200).json({
    status: 'ok',
    service: 'Green Gate Advisory API',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      status: dbStates[dbState] || 'unknown',
      configured: isConfigured,
      ...(isConfigured && { host: mongoose.connection.host || 'none' })
    }
  });
});

export default router;
