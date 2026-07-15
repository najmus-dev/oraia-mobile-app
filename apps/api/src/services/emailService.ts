import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config';
import { logger } from '../lib/logger';

let transporter: Transporter | null = null;

/** User-supplied values must be escaped before interpolating into email HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmailConfigured(): boolean {
  return Boolean(
    (config.email.smtpService || config.email.smtpHost) &&
      config.email.smtpUser &&
      config.email.smtpPass,
  );
}

function getTransporter(): Transporter {
  if (!transporter) {
    const auth = {
      user: config.email.smtpUser,
      pass: config.email.smtpPass,
    };
    transporter = config.email.smtpService
      ? nodemailer.createTransport({ service: config.email.smtpService, auth })
      : nodemailer.createTransport({
          host: config.email.smtpHost,
          port: config.email.smtpPort,
          secure: config.email.smtpSecure,
          auth,
        });
  }
  return transporter;
}

async function sendEmail(input: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  if (!isEmailConfigured()) {
    logger.warn('Email not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — skipping send', {
      subject: input.subject,
    });
    return;
  }
  if (input.to.length === 0) {
    logger.warn('No recipients configured for email — skipping send', { subject: input.subject });
    return;
  }
  await getTransporter().sendMail({
    from: config.email.from,
    to: input.to.join(', '),
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  logger.info('Email sent', { subject: input.subject, to: input.to });
}

/**
 * Notify agency admins that a new user signed up and is awaiting approval.
 * Fire-and-forget safe: never throws, so signup can't fail because of email issues.
 */
export async function notifyAdminsOfSignup(input: {
  email: string;
  userId: string;
}): Promise<void> {
  const signupDate = new Date().toUTCString();
  const safeEmail = escapeHtml(input.email);
  const safeUserId = escapeHtml(input.userId);
  try {
    await sendEmail({
      to: config.email.adminNotifyEmails,
      subject: `ORAIA: New sign-up awaiting approval — ${input.email}`,
      text: [
        'A new user signed up for the ORAIA mobile app and is awaiting approval.',
        '',
        `Email: ${input.email}`,
        `User ID: ${input.userId}`,
        `Signed up: ${signupDate}`,
        '',
        'To approve, sign in as an agency admin and use:',
        `  GET  /api/auth/users/pending`,
        `  POST /api/auth/users/${input.userId}/approve  { "allowedLocationIds": ["..."] }`,
        `  POST /api/auth/users/${input.userId}/reject`,
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
          <div style="background: #4f46e5; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h2 style="color: #ffffff; margin: 0; font-size: 18px;">New sign-up awaiting approval</h2>
          </div>
          <div style="border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 24px;">
            <p style="margin-top: 0;">A new user signed up for the <strong>ORAIA</strong> mobile app and is awaiting your approval.</p>
            <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
              <tr>
                <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold; width: 120px;">Email</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${safeEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">User ID</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb; font-family: monospace;">${safeUserId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: bold;">Signed up</td>
                <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${signupDate}</td>
              </tr>
            </table>
            <p style="color: #6b7280; font-size: 13px; margin-bottom: 0;">
              To approve, sign in as an agency admin and call
              <code>POST /api/auth/users/${safeUserId}/approve</code>
              with the allowed location ids, or
              <code>POST /api/auth/users/${safeUserId}/reject</code> to reject.
            </p>
          </div>
        </div>
      `,
    });
  } catch (err) {
    logger.error('Failed to send signup notification email', {
      email: input.email,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
