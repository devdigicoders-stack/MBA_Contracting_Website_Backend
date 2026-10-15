import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  logout,
  getSession,
  getEnquiries,
  getEnquiryById,
  updateEnquiryStatus,
  deleteEnquiry,
  updateProfile
} from '../controllers/adminController.js';
import { requireAdminAuth } from '../middleware/adminAuth.js';

const router = express.Router();

// Rate limiter for admin login endpoint (protect against brute force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts from this IP. Please try again after 15 minutes.'
  }
});

// Authentication endpoints
router.post('/login', loginLimiter, login);
router.post('/logout', requireAdminAuth, logout);
router.get('/session', requireAdminAuth, getSession);
router.put('/profile', requireAdminAuth, updateProfile);

// Enquiries management endpoints
router.get('/enquiries', requireAdminAuth, getEnquiries);
router.get('/enquiries/:id', requireAdminAuth, getEnquiryById);
router.patch('/enquiries/:id/status', requireAdminAuth, updateEnquiryStatus);
router.delete('/enquiries/:id', requireAdminAuth, deleteEnquiry);

export default router;
