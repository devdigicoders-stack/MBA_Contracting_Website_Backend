import { ALLOWED_SERVICES, ALLOWED_CONTACT_METHODS, ALLOWED_ENQUIRY_TYPES } from '../models/Enquiry.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-side validator for enquiry submissions.
 * Validates, sanitizes, and normalizes inputs before database insertion.
 */
export function validateEnquiryInput(req, res, next) {
  const body = req.body || {};
  const errors = {};

  // 1. Anti-spam honeypot detection
  if (body.company_website_url_hp && String(body.company_website_url_hp).trim() !== '') {
    // Silently reject bots with fake success to prevent them learning
    return res.status(200).json({
      success: true,
      message: 'Thank you for contacting Green Gate Advisory. Your enquiry has been received.'
    });
  }

  // 2. Full Name
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  if (!fullName) {
    errors.fullName = 'Full name is required.';
  } else if (fullName.length < 2) {
    errors.fullName = 'Full name must be at least 2 characters.';
  } else if (fullName.length > 120) {
    errors.fullName = 'Full name cannot exceed 120 characters.';
  }

  // 3. Organisation (optional)
  const organisation = typeof body.organisation === 'string' ? body.organisation.trim() : '';
  if (organisation.length > 150) {
    errors.organisation = 'Organisation name cannot exceed 150 characters.';
  }

  // 4. Work Email
  const workEmail = typeof body.workEmail === 'string' ? body.workEmail.trim().toLowerCase() : '';
  if (!workEmail) {
    errors.workEmail = 'Work email is required.';
  } else if (!emailRegex.test(workEmail)) {
    errors.workEmail = 'Please provide a valid corporate or professional email address.';
  } else if (workEmail.length > 150) {
    errors.workEmail = 'Email address cannot exceed 150 characters.';
  }

  // 5. Country / Region
  const countryOrRegion = typeof body.countryOrRegion === 'string' ? body.countryOrRegion.trim() : '';
  if (!countryOrRegion) {
    errors.countryOrRegion = 'Country or region is required.';
  } else if (countryOrRegion.length > 100) {
    errors.countryOrRegion = 'Country or region cannot exceed 100 characters.';
  }

  // 6. Role (optional)
  const role = typeof body.role === 'string' ? body.role.trim() : '';
  if (role.length > 100) {
    errors.role = 'Role title cannot exceed 100 characters.';
  }

  // 7. Service of Interest
  const serviceInterest = typeof body.serviceInterest === 'string' ? body.serviceInterest.trim() : '';
  if (!serviceInterest) {
    errors.serviceInterest = 'Please select a service of interest.';
  } else if (!ALLOWED_SERVICES.includes(serviceInterest)) {
    errors.serviceInterest = 'Selected advisory service is not recognized.';
  }

  // 8. Requirement Description
  const requirementDescription = typeof body.requirementDescription === 'string' ? body.requirementDescription.trim() : '';
  if (!requirementDescription) {
    errors.requirementDescription = 'A brief description of your requirement is required.';
  } else if (requirementDescription.length < 10) {
    errors.requirementDescription = 'Requirement description must be at least 10 characters.';
  } else if (requirementDescription.length > 3000) {
    errors.requirementDescription = 'Requirement description cannot exceed 3000 characters.';
  }

  // 9. Preferred Contact Method & Phone
  const preferredContactMethod = typeof body.preferredContactMethod === 'string' && body.preferredContactMethod.trim() !== ''
    ? body.preferredContactMethod.trim()
    : 'Email';

  if (!ALLOWED_CONTACT_METHODS.map(m => m.toLowerCase()).includes(preferredContactMethod.toLowerCase())) {
    errors.preferredContactMethod = 'Invalid contact method selected.';
  }

  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  if (preferredContactMethod.toLowerCase() === 'phone') {
    if (!phone) {
      errors.phone = 'Phone number is required when phone is selected as preferred contact method.';
    } else if (phone.length < 6 || phone.length > 40) {
      errors.phone = 'Please provide a valid international telephone number.';
    }
  }

  // 10. Enquiry Type
  const enquiryType = typeof body.enquiryType === 'string' && body.enquiryType.trim() !== ''
    ? body.enquiryType.trim().toLowerCase()
    : 'consultation';

  if (!ALLOWED_ENQUIRY_TYPES.includes(enquiryType)) {
    errors.enquiryType = 'Invalid enquiry type specified.';
  }

  // 11. Privacy Acknowledgement
  if (body.privacyAcknowledged !== true && body.privacyAcknowledged !== 'true') {
    errors.privacyAcknowledged = 'You must acknowledge the privacy notice to submit an enquiry.';
  }

  // 12. Language
  const language = body.language === 'es' ? 'es' : 'en';

  // Return validation error response if any
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed. Please correct the highlighted fields.',
      errors
    });
  }

  // Attach sanitized fields to req.sanitizedBody
  req.sanitizedBody = {
    fullName,
    organisation,
    workEmail,
    countryOrRegion,
    role,
    serviceInterest,
    requirementDescription,
    preferredContactMethod,
    phone,
    enquiryType,
    privacyAcknowledged: true,
    language
  };

  next();
}
