import mongoose from 'mongoose';
import Enquiry from '../models/Enquiry.js';
import { sendEnquiryNotification } from '../services/emailService.js';
import { devMockEnquiries } from './adminController.js';

/**
 * Controller for POST /api/enquiries
 * Securely stores incoming enquiries and triggers optional email notification.
 */
export async function createEnquiry(req, res, next) {
  try {
    const data = req.sanitizedBody;

    // Capture connection metadata safely
    const ipAddress = 
      req.headers['x-forwarded-for']?.split(',')[0].trim() || 
      req.socket.remoteAddress || 
      '';
    const userAgent = req.headers['user-agent']?.slice(0, 300) || '';

    const isDbConnected = mongoose.connection.readyState === 1;

    let savedEnquiry = null;

    if (isDbConnected) {
      // 1. Create and save Enquiry document in MongoDB
      const enquiryDoc = new Enquiry({
        ...data,
        ipAddress,
        userAgent,
        notificationStatus: 'pending'
      });

      savedEnquiry = await enquiryDoc.save();
      console.log(`[Enquiry Controller]: New enquiry securely stored with ID: ${savedEnquiry._id} (Service: ${savedEnquiry.serviceInterest})`);
    } else {
      // Database not connected (e.g. running in development before Atlas URI is provided)
      console.warn('[Enquiry Controller]: MongoDB is not connected. Processing enquiry in mock development mode.');
      savedEnquiry = {
        _id: 'mock-' + Date.now().toString(36),
        ...data,
        ipAddress,
        userAgent,
        status: 'new',
        adminNotes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notificationStatus: 'disabled'
      };
      // Store in memory for admin dashboard to see real website inquiries
      devMockEnquiries.unshift(savedEnquiry);
    }

    // 2. Dispatch email notification asynchronously without blocking response if slow
    sendEnquiryNotification(savedEnquiry).then(async (emailResult) => {
      if (isDbConnected && savedEnquiry._id && !String(savedEnquiry._id).startsWith('mock-')) {
        try {
          await Enquiry.findByIdAndUpdate(savedEnquiry._id, {
            notificationStatus: emailResult.status,
            notificationError: emailResult.error || null
          });
        } catch (dbErr) {
          console.error(`[Enquiry Update Error]: Could not update notification status: ${dbErr.message}`);
        }
      }
    }).catch((emailErr) => {
      console.error(`[Enquiry Email Unhandled]: ${emailErr.message}`);
    });

    // 3. Success response using the source PDF confirmation message
    const successMessage = data.language === 'es'
      ? 'Gracias por comunicarse con Green Gate Advisory. Su consulta ha sido recibida. Nuestro equipo revisará la información provista y se pondrá en contacto utilizando los datos suministrados.'
      : 'Thank you for contacting Green Gate Advisory. Your enquiry has been received. Our team will review the information provided and follow up using the contact details you supplied.';

    return res.status(201).json({
      success: true,
      message: successMessage,
      enquiryId: savedEnquiry._id
    });
  } catch (error) {
    console.error(`[Enquiry Controller Error]: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'An internal server error occurred while processing your enquiry. Please try again or email contact@greengateadvisory.com directly.'
    });
  }
}
