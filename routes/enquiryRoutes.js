import { Router } from 'express';
import { enquiryRateLimiter } from '../middleware/rateLimiter.js';
import { validateEnquiryInput } from '../validators/enquiryValidator.js';
import { createEnquiry } from '../controllers/enquiryController.js';

const router = Router();

/**
 * @route   POST /api/enquiries
 * @desc    Submit a new advisory consultation or proposal enquiry
 * @access  Public (Rate-limited, validated, and sanitized)
 */
router.post('/', enquiryRateLimiter, validateEnquiryInput, createEnquiry);

export default router;
