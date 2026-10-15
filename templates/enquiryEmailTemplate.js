/**
 * Escapes unsafe HTML characters to prevent XSS / markup injection in email clients.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generates branded HTML and plain-text email templates for new enquiry notifications.
 */
export function generateEnquiryEmail(enquiry) {
  const safeName = escapeHtml(enquiry.fullName);
  const safeOrg = escapeHtml(enquiry.organisation || 'Not specified');
  const safeEmail = escapeHtml(enquiry.workEmail);
  const safeCountry = escapeHtml(enquiry.countryOrRegion);
  const safeRole = escapeHtml(enquiry.role || 'Not specified');
  const safeService = escapeHtml(enquiry.serviceInterest);
  const safeDesc = escapeHtml(enquiry.requirementDescription).replace(/\n/g, '<br/>');
  const safeMethod = escapeHtml(enquiry.preferredContactMethod || 'Email');
  const safePhone = escapeHtml(enquiry.phone || 'Not supplied');
  const safeType = escapeHtml(enquiry.enquiryType === 'proposal' ? 'Proposal Request' : 'Consultation Enquiry');
  const safeLang = escapeHtml(enquiry.language === 'es' ? 'Spanish (es)' : 'English (en)');
  const submissionTime = new Date().toUTCString();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>New Green Gate Advisory Enquiry</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F7F1; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #182A24;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F7F1; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E9DF; box-shadow: 0 4px 16px rgba(18, 63, 50, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #123F32; padding: 32px 36px; text-align: left;">
              <span style="display: inline-block; padding: 4px 12px; background-color: rgba(210, 173, 103, 0.15); color: #D2AD67; border: 1px solid rgba(210, 173, 103, 0.3); border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                ${safeType}
              </span>
              <h1 style="color: #FFFFFF; margin: 16px 0 6px 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
                New Advisory Enquiry Received
              </h1>
              <p style="color: #E2E9DF; margin: 0; font-size: 13px; opacity: 0.9;">
                Service Interest: <strong style="color: #D2AD67;">${safeService}</strong>
              </p>
            </td>
          </tr>

          <!-- Summary Table -->
          <tr>
            <td style="padding: 32px 36px 16px 36px;">
              <h2 style="color: #123F32; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 16px 0; border-bottom: 2px solid #F4F7F1; padding-bottom: 8px;">
                Contact Details
              </h2>
              
              <table role="presentation" width="100%" cellspacing="0" cellpadding="8" style="font-size: 13px; line-height: 1.5;">
                <tr style="background-color: #F4F7F1;">
                  <td width="35%" style="color: #486056; font-weight: 600;">Full Name:</td>
                  <td width="65%" style="color: #182A24; font-weight: 700;">${safeName}</td>
                </tr>
                <tr>
                  <td style="color: #486056; font-weight: 600;">Work Email:</td>
                  <td style="color: #182A24;"><a href="mailto:${safeEmail}" style="color: #1E604A; text-decoration: none; font-weight: 600;">${safeEmail}</a></td>
                </tr>
                <tr style="background-color: #F4F7F1;">
                  <td style="color: #486056; font-weight: 600;">Organisation:</td>
                  <td style="color: #182A24;">${safeOrg}</td>
                </tr>
                <tr>
                  <td style="color: #486056; font-weight: 600;">Country / Region:</td>
                  <td style="color: #182A24;">${safeCountry}</td>
                </tr>
                <tr style="background-color: #F4F7F1;">
                  <td style="color: #486056; font-weight: 600;">Role / Title:</td>
                  <td style="color: #182A24;">${safeRole}</td>
                </tr>
                <tr>
                  <td style="color: #486056; font-weight: 600;">Preferred Method:</td>
                  <td style="color: #182A24;">${safeMethod}</td>
                </tr>
                <tr style="background-color: #F4F7F1;">
                  <td style="color: #486056; font-weight: 600;">Telephone Number:</td>
                  <td style="color: #182A24;">${safePhone}</td>
                </tr>
                <tr>
                  <td style="color: #486056; font-weight: 600;">Submission Locale:</td>
                  <td style="color: #182A24;">${safeLang}</td>
                </tr>
                <tr style="background-color: #F4F7F1;">
                  <td style="color: #486056; font-weight: 600;">Submission Time:</td>
                  <td style="color: #182A24;">${submissionTime}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Requirement Description Block -->
          <tr>
            <td style="padding: 0 36px 32px 36px;">
              <h2 style="color: #123F32; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px 0; border-bottom: 2px solid #F4F7F1; padding-bottom: 8px;">
                Requirement Description
              </h2>
              <div style="background-color: #F4F7F1; border-left: 4px solid #1E604A; border-radius: 6px; padding: 16px 20px; font-size: 13px; line-height: 1.6; color: #182A24;">
                ${safeDesc}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #123F32; padding: 20px 36px; text-align: center; color: #E2E9DF; font-size: 11px; opacity: 0.8;">
              Green Gate Advisory · Environmental, Climate and Carbon Market Advisory<br/>
              Confidential internal notification generated by the website enquiry system.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = `
NEW GREEN GATE ADVISORY ENQUIRY
================================
Enquiry Type: ${safeType}
Service Interest: ${enquiry.serviceInterest}
Submitted At: ${submissionTime}

CONTACT DETAILS
----------------
Full Name: ${enquiry.fullName}
Work Email: ${enquiry.workEmail}
Organisation: ${enquiry.organisation || 'Not specified'}
Country / Region: ${enquiry.countryOrRegion}
Role: ${enquiry.role || 'Not specified'}
Preferred Contact Method: ${enquiry.preferredContactMethod || 'Email'}
Phone Number: ${enquiry.phone || 'Not supplied'}
Language: ${enquiry.language}

REQUIREMENT DESCRIPTION
------------------------
${enquiry.requirementDescription}

--
Green Gate Advisory Automated Notification
`;

  return { html, text };
}
