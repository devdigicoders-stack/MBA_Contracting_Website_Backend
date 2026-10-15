import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

export const ADMIN_COOKIE_NAME = 'admin_session_token';

/**
 * Middleware: Verify Admin Authentication
 * Extracts token from HttpOnly cookie or Authorization Bearer header.
 */
export async function requireAdminAuth(req, res, next) {
  try {
    // 1. Extract token from HttpOnly cookie or Authorization Bearer header
    let token = req.cookies?.[ADMIN_COOKIE_NAME];

    if (!token && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7).trim();
      }
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. No session or token provided.'
      });
    }

    // 2. Verify JWT signature
    const secret = process.env.SESSION_SECRET || 'green-gate-advisory-default-secret';
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or expired session. Please log in again.'
      });
    }

    // 3. Check Admin in MongoDB if connected
    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Admin account not found or deactivated.'
        });
      }
      req.admin = admin;
    } else {
      // Mock development fallback
      req.admin = {
        _id: decoded.id,
        username: decoded.username || 'admin',
        email: decoded.email || 'admin@greengateadvisory.com',
        role: decoded.role || 'admin'
      };
    }

    next();
  } catch (error) {
    console.error(`[Admin Auth Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Authentication verification failure.'
    });
  }
}
