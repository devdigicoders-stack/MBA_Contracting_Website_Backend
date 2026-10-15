import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import healthRoutes from './routes/health.js';
import enquiryRoutes from './routes/enquiryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security HTTP headers
app.use(helmet());

// Cookie Parser (needed for HttpOnly admin session tokens)
app.use(cookieParser(process.env.SESSION_SECRET || 'green-gate-advisory-cookie-secret'));

// CORS Configuration - allows configured origins or local development ports
const rawOrigins = process.env.CLIENT_ORIGINS || process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,https://green-gate-advisory.vercel.app';
const allowedOrigins = rawOrigins.split(',').map(o => o.trim().replace(/\/+$/, ''));

app.use(cors({
  origin: (origin, callback) => {
    const isDev = process.env.NODE_ENV !== 'production';
    const isLocalhost = isDev && (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:'));
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : '';
    const isVercel = normalizedOrigin.endsWith('.vercel.app');

    if (!origin || allowedOrigins.includes(normalizedOrigin) || isLocalhost || isVercel) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked request from origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Body Parser with strict 50kb limit
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Health check route
app.use('/api/health', healthRoutes);

// Public Website: Enquiry Submission API
app.use('/api/enquiries', enquiryRoutes);

// Admin Panel: Authentication & Enquiries Management API
app.use('/api/admin', adminRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'Green Gate Advisory Shared API',
    status: 'online',
    endpoints: {
      health: 'GET /api/health',
      publicEnquiries: 'POST /api/enquiries',
      adminLogin: 'POST /api/admin/login',
      adminLogout: 'POST /api/admin/logout',
      adminSession: 'GET /api/admin/session',
      adminEnquiries: 'GET /api/admin/enquiries',
      adminEnquiryDetail: 'GET /api/admin/enquiries/:id',
      adminUpdateStatus: 'PATCH /api/admin/enquiries/:id/status',
      adminDeleteEnquiry: 'DELETE /api/admin/enquiries/:id'
    },
    version: '1.1.0'
  });
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
