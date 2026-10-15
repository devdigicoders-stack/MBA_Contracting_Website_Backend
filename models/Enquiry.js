import mongoose from 'mongoose';

export const ALLOWED_SERVICES = [
  'Carbon Markets',
  'CBAM',
  'ETS and Carbon Pricing',
  'Climate Finance',
  'Nature-Based Solutions',
  'Environmental and Climate Policy',
  'Corporate Climate and ESG',
  'MRV and GHG Accounting',
  'Training and Capacity Building',
  'Other'
];

export const ALLOWED_CONTACT_METHODS = [
  'Email',
  'Phone',
  'Virtual Call',
  'No Preference'
];

export const ALLOWED_ENQUIRY_TYPES = [
  'consultation',
  'proposal'
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const enquirySchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [120, 'Full name cannot exceed 120 characters']
    },
    organisation: {
      type: String,
      trim: true,
      maxlength: [150, 'Organisation cannot exceed 150 characters'],
      default: ''
    },
    workEmail: {
      type: String,
      required: [true, 'Work email is required'],
      trim: true,
      lowercase: true,
      match: [emailRegex, 'Please provide a valid email address'],
      maxlength: [150, 'Email cannot exceed 150 characters']
    },
    countryOrRegion: {
      type: String,
      required: [true, 'Country or region is required'],
      trim: true,
      maxlength: [100, 'Country or region cannot exceed 100 characters']
    },
    role: {
      type: String,
      trim: true,
      maxlength: [100, 'Role cannot exceed 100 characters'],
      default: ''
    },
    serviceInterest: {
      type: String,
      required: [true, 'Service of interest is required'],
      enum: {
        values: ALLOWED_SERVICES,
        message: '{VALUE} is not a valid advisory service'
      }
    },
    requirementDescription: {
      type: String,
      required: [true, 'Requirement description is required'],
      trim: true,
      minlength: [10, 'Description must be at least 10 characters'],
      maxlength: [3000, 'Description cannot exceed 3000 characters']
    },
    preferredContactMethod: {
      type: String,
      enum: {
        values: ALLOWED_CONTACT_METHODS,
        message: '{VALUE} is not a valid contact method'
      },
      default: 'Email'
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [40, 'Phone number cannot exceed 40 characters'],
      default: ''
    },
    enquiryType: {
      type: String,
      enum: {
        values: ALLOWED_ENQUIRY_TYPES,
        message: '{VALUE} is not a valid enquiry type'
      },
      default: 'consultation'
    },
    privacyAcknowledged: {
      type: Boolean,
      required: [true, 'Privacy acknowledgement is required'],
      validate: {
        validator: (v) => v === true,
        message: 'You must acknowledge the privacy notice to proceed'
      }
    },
    language: {
      type: String,
      enum: ['en', 'es'],
      default: 'en'
    },
    notificationStatus: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'disabled'],
      default: 'pending'
    },
    notificationError: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['new', 'in_progress', 'contacted', 'resolved', 'closed', 'archived'],
      default: 'new',
      index: true
    },
    adminNotes: {
      type: String,
      default: ''
    },
    ipAddress: {
      type: String,
      default: ''
    },
    userAgent: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Prevent exposing internal Mongoose metadata
enquirySchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  delete obj.ipAddress;
  delete obj.userAgent;
  return obj;
};

const Enquiry = mongoose.models.Enquiry || mongoose.model('Enquiry', enquirySchema);

export default Enquiry;
