import { generateEnquiryEmail } from '../templates/enquiryEmailTemplate.js';

/**
 * Dispatches an email notification for a newly saved enquiry.
 * Handles missing configuration gracefully without throwing uncaught exceptions.
 */
export async function sendEnquiryNotification(enquiry) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.MAIL_FROM || `"Green Gate Advisory" <no-reply@greengateadvisory.com>`;
  const receiver = process.env.ENQUIRY_RECEIVER_EMAIL;

  // 1. Check if SMTP configuration is present
  if (!host || !user || !pass || !receiver) {
    console.log('[Email Service]: SMTP credentials or receiver not configured. Notification marked as disabled.');
    return {
      success: false,
      status: 'disabled',
      message: 'SMTP configuration pending in server/.env'
    };
  }

  // 2. Try loading nodemailer dynamically
  let nodemailer;
  try {
    const imported = await import('nodemailer');
    nodemailer = imported.default || imported;
  } catch (err) {
    console.warn('[Email Service]: Nodemailer package not available. Skipping email dispatch.');
    return {
      success: false,
      status: 'disabled',
      message: 'nodemailer package pending installation'
    };
  }

  // 3. Create transporter and send
  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    const { html, text } = generateEnquiryEmail(enquiry);
    const subject = `New Green Gate Advisory Enquiry — ${enquiry.serviceInterest}`;

    const info = await transporter.sendMail({
      from,
      to: receiver,
      subject,
      text,
      html
    });

    console.log(`[Email Service]: Notification sent successfully (Message ID: ${info.messageId})`);
    return {
      success: true,
      status: 'sent',
      messageId: info.messageId
    };
  } catch (error) {
    console.error(`[Email Service Error]: Failed to dispatch notification: ${error.message}`);
    return {
      success: false,
      status: 'failed',
      error: error.message
    };
  }
}
