import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Enquiry from '../models/Enquiry.js';
import { ADMIN_COOKIE_NAME } from '../middleware/adminAuth.js';

// In-memory storage for submitted website enquiries when MongoDB Atlas is not yet connected
export let devMockEnquiries = [];


function generateToken(admin) {
  const secret = process.env.SESSION_SECRET || 'green-gate-advisory-default-secret';
  return jwt.sign(
    {
      id: admin._id,
      username: admin.username,
      email: admin.email,
      role: admin.role
    },
    secret,
    { expiresIn: '7d' }
  );
}

function setSessionCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

/**
 * POST /api/admin/login
 */
export async function login(req, res) {
  try {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username/Email and Password are required.'
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    let admin = null;

    if (isDbConnected) {
      const identifier = usernameOrEmail.trim().toLowerCase();
      admin = await Admin.findOne({
        $or: [{ username: identifier }, { email: identifier }]
      });

      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials provided.'
        });
      }

      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          error: 'This administrator account has been deactivated.'
        });
      }

      const isMatch = await admin.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: 'Invalid credentials provided.'
        });
      }

      admin.lastLogin = new Date();
      await admin.save();
    } else {
      // Offline Development Mock Mode: Allows logging in with default dev credentials
      console.warn('[Admin Controller]: MongoDB not connected. Authenticating with dev mock admin credentials.');
      const identifier = usernameOrEmail.trim().toLowerCase();
      if ((identifier === 'admin' || identifier === 'admin@greengateadvisory.com') && password === 'Admin@123456') {
        admin = {
          _id: 'dev-admin-id-1',
          username: 'admin',
          email: 'admin@greengateadvisory.com',
          role: 'superadmin'
        };
      } else {
        return res.status(401).json({
          success: false,
          error: 'Invalid dev credentials. In offline development mode, use: admin / Admin@123456'
        });
      }
    }

    const token = generateToken(admin);
    setSessionCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Login successful.',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error(`[Admin Login Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An internal error occurred during login.'
    });
  }
}

/**
 * POST /api/admin/logout
 */
export async function logout(req, res) {
  try {
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(ADMIN_COOKIE_NAME, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax'
    });

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Logout error.'
    });
  }
}

/**
 * GET /api/admin/session
 */
export async function getSession(req, res) {
  try {
    return res.status(200).json({
      success: true,
      admin: {
        id: req.admin._id || req.admin.id,
        username: req.admin.username,
        email: req.admin.email,
        role: req.admin.role
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Session check failed.'
    });
  }
}

/**
 * GET /api/admin/enquiries
 * Supports: ?search=...&status=...&service=...&page=1&limit=15&sort=-createdAt
 */
export async function getEnquiries(req, res) {
  try {
    const { 
      search = '', 
      status = '', 
      service = '', 
      page = 1, 
      limit = 15, 
      sort = '-createdAt' 
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 15));
    const skip = (pageNum - 1) * limitNum;

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (service && service !== 'all') {
        query.serviceInterest = service;
      }

      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), 'i');
        query.$or = [
          { fullName: regex },
          { organisation: regex },
          { workEmail: regex },
          { countryOrRegion: regex },
          { requirementDescription: regex }
        ];
      }

      const [enquiries, totalCount, statusCountsRaw] = await Promise.all([
        Enquiry.find(query)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Enquiry.countDocuments(query),
        Enquiry.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ])
      ]);

      const counts = {
        all: await Enquiry.countDocuments(),
        new: 0,
        in_progress: 0,
        contacted: 0,
        resolved: 0,
        closed: 0,
        archived: 0
      };

      statusCountsRaw.forEach(item => {
        if (item._id && counts[item._id] !== undefined) {
          counts[item._id] = item.count;
        }
      });

      return res.status(200).json({
        success: true,
        enquiries,
        pagination: {
          total: totalCount,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(totalCount / limitNum) || 1
        },
        counts
      });
    } else {
      // Mock development data filtering
      let filtered = [...devMockEnquiries];

      if (status && status !== 'all') {
        filtered = filtered.filter(e => e.status === status);
      }

      if (service && service !== 'all') {
        filtered = filtered.filter(e => e.serviceInterest === service);
      }

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter(e => 
          (e.fullName && e.fullName.toLowerCase().includes(q)) ||
          (e.organisation && e.organisation.toLowerCase().includes(q)) ||
          (e.workEmail && e.workEmail.toLowerCase().includes(q)) ||
          (e.countryOrRegion && e.countryOrRegion.toLowerCase().includes(q)) ||
          (e.requirementDescription && e.requirementDescription.toLowerCase().includes(q))
        );
      }

      const total = filtered.length;
      const paginated = filtered.slice(skip, skip + limitNum);

      const counts = {
        all: devMockEnquiries.length,
        new: devMockEnquiries.filter(e => e.status === 'new').length,
        in_progress: devMockEnquiries.filter(e => e.status === 'in_progress').length,
        contacted: devMockEnquiries.filter(e => e.status === 'contacted').length,
        resolved: devMockEnquiries.filter(e => e.status === 'resolved').length,
        closed: devMockEnquiries.filter(e => e.status === 'closed').length,
        archived: devMockEnquiries.filter(e => e.status === 'archived').length
      };

      return res.status(200).json({
        success: true,
        enquiries: paginated,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1
        },
        counts
      });
    }
  } catch (error) {
    console.error(`[Get Enquiries Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve enquiries list.'
    });
  }
}

/**
 * GET /api/admin/enquiries/:id
 */
export async function getEnquiryById(req, res) {
  try {
    const { id } = req.params;

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const enquiry = await Enquiry.findById(id).lean();
      if (!enquiry) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }
      return res.status(200).json({
        success: true,
        enquiry
      });
    } else {
      const enquiry = devMockEnquiries.find(e => e._id === id);
      if (!enquiry) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }
      return res.status(200).json({
        success: true,
        enquiry
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Error retrieving enquiry detail.'
    });
  }
}

/**
 * PATCH /api/admin/enquiries/:id/status
 */
export async function updateEnquiryStatus(req, res) {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    const validStatuses = ['new', 'in_progress', 'contacted', 'resolved', 'closed', 'archived'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status value. Allowed: ${validStatuses.join(', ')}`
      });
    }

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const updateData = {};
      if (status) updateData.status = status;
      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

      const updated = await Enquiry.findByIdAndUpdate(id, updateData, { new: true });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Enquiry updated successfully.',
        enquiry: updated
      });
    } else {
      const index = devMockEnquiries.findIndex(e => e._id === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }

      if (status) devMockEnquiries[index].status = status;
      if (adminNotes !== undefined) devMockEnquiries[index].adminNotes = adminNotes;
      devMockEnquiries[index].updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: 'Enquiry updated successfully.',
        enquiry: devMockEnquiries[index]
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update enquiry status.'
    });
  }
}

/**
 * DELETE /api/admin/enquiries/:id
 */
export async function deleteEnquiry(req, res) {
  try {
    const { id } = req.params;

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const deleted = await Enquiry.findByIdAndDelete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Enquiry deleted successfully.'
      });
    } else {
      const index = devMockEnquiries.findIndex(e => e._id === id);
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Enquiry not found.'
        });
      }
      devMockEnquiries.splice(index, 1);
      return res.status(200).json({
        success: true,
        message: 'Enquiry deleted successfully.'
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete enquiry.'
    });
  }
}

/**
 * PUT /api/admin/profile
 * Allows admin to update their username, email, and password
 */
export async function updateProfile(req, res) {
  try {
    const adminId = req.admin?._id || req.admin?.id;
    const { username, email, currentPassword, newPassword } = req.body;

    const isDbConnected = mongoose.connection.readyState === 1;

    if (isDbConnected) {
      const admin = await Admin.findById(adminId);
      if (!admin) {
        return res.status(404).json({ success: false, error: 'Admin account not found in database.' });
      }

      if (username && username.trim()) {
        const cleanUsername = username.trim().toLowerCase();
        // Check if taken
        const existing = await Admin.findOne({ username: cleanUsername, _id: { $ne: adminId } });
        if (existing) {
          return res.status(400).json({ success: false, error: 'This username is already in use.' });
        }
        admin.username = cleanUsername;
      }

      if (email && email.trim()) {
        const cleanEmail = email.trim().toLowerCase();
        const existing = await Admin.findOne({ email: cleanEmail, _id: { $ne: adminId } });
        if (existing) {
          return res.status(400).json({ success: false, error: 'This email is already in use.' });
        }
        admin.email = cleanEmail;
      }

      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Current password is required to change your password.' });
        }
        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
          return res.status(400).json({ success: false, error: 'Current password does not match.' });
        }
        if (newPassword.length < 8) {
          return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
        }
        admin.password = newPassword;
      }

      await admin.save();

      return res.status(200).json({
        success: true,
        message: 'Admin profile updated successfully.',
        admin: {
          id: admin._id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      });
    } else {
      // In offline / dev mode
      if (newPassword) {
        if (!currentPassword) {
          return res.status(400).json({ success: false, error: 'Current password is required to change your password.' });
        }
        if (currentPassword !== 'Admin@123456') {
          return res.status(400).json({ success: false, error: 'Current password does not match.' });
        }
        if (newPassword.length < 8) {
          return res.status(400).json({ success: false, error: 'New password must be at least 8 characters long.' });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Admin profile updated successfully.',
        admin: {
          id: adminId || 'dev-admin-id-1',
          username: username ? username.trim().toLowerCase() : (req.admin?.username || 'admin'),
          email: email ? email.trim().toLowerCase() : (req.admin?.email || 'admin@greengateadvisory.com'),
          role: req.admin?.role || 'superadmin'
        }
      });
    }
  } catch (error) {
    console.error(`[Update Profile Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An error occurred while updating profile.'
    });
  }
}

