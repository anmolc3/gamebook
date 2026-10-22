import nodemailer, { Transporter } from 'nodemailer';
import fs from 'fs';
import path from 'path';

export interface SendPasswordResetOptions {
  toEmail: string;
  username: string;
  code: string;
  expiresInMinutes: number;
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Initialize or retrieve the cached nodemailer transporter
   */
  private static getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    // 1. Gmail App Password Configuration
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;
    if (gmailUser && gmailPass) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailPass.replace(/\s+/g, ''),
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      return this.transporter;
    }

    // 2. Resend SMTP Configuration (Fallback if HTTP API not used)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      this.transporter = nodemailer.createTransport({
        host: 'smtp.resend.com',
        port: 465,
        secure: true,
        auth: {
          user: 'resend',
          pass: resendApiKey,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      return this.transporter;
    }

    // 3. Generic Custom SMTP Configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 5000,
      });
      return this.transporter;
    }

    return null;
  }

  /**
   * Send a gaming-themed password reset email with the 6-digit verification code
   */
  static async sendPasswordResetCode({
    toEmail,
    username,
    code,
    expiresInMinutes,
  }: SendPasswordResetOptions): Promise<{ sent: boolean; message: string }> {
    const resendApiKey = process.env.RESEND_API_KEY;
    const fromAddress = resendApiKey
      ? (process.env.EMAIL_FROM && !process.env.EMAIL_FROM.includes('@gmail.com')
          ? process.env.EMAIL_FROM
          : 'Otter <onboarding@resend.dev>')
      : process.env.EMAIL_FROM ||
        (process.env.GMAIL_USER
          ? `"Otter" <${process.env.GMAIL_USER}>`
          : '"Otter" <onboarding@resend.dev>');

    // Build HTML template
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; margin: 0; padding: 24px; color: #f3f4f6; }
    .card { max-width: 500px; margin: 0 auto; background: linear-gradient(180deg, #161f30 0%, #0d1525 100%); border-radius: 20px; border: 1px solid #1f2d47; padding: 36px 28px; box-shadow: 0 16px 40px rgba(0,0,0,0.5); }
    .header { text-align: center; margin-bottom: 24px; }
    .logo-container { margin-bottom: 14px; }
    .logo-img { width: 76px; height: 76px; border-radius: 20px; display: inline-block; box-shadow: 0 10px 25px rgba(0,0,0,0.5); border: 2px solid #1f2d47; }
    .title { font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; margin: 12px 0 6px 0; }
    .subtitle { font-size: 14px; color: #94a3b8; margin: 0; }
    .code-container { background: #070d18; border: 2px dashed #00f0ff; border-radius: 16px; padding: 20px; text-align: center; margin: 28px 0; }
    .code { font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 8px; color: #00f0ff; margin: 0; }
    .expire-note { display: inline-flex; align-items: center; justify-content: center; gap: 6px; font-size: 13px; color: #f59e0b; font-weight: 600; margin-top: 10px; }
    .expire-note svg { vertical-align: -2px; }
    .instructions { font-size: 14px; line-height: 22px; color: #cbd5e1; margin-bottom: 20px; }
    .footer { text-align: center; font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1f2d47; padding-top: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="logo-container">
        <img src="cid:applogo" class="logo-img" alt="Otter" />
      </div>
      <h1 class="title">Password Reset Request</h1>
      <p class="subtitle">Otter Security</p>
    </div>

    <p class="instructions">
      Hey <strong>${username}</strong>,<br>
      We received a request to reset the password for your Otter account. Enter the verification code below in your app to continue:
    </p>

    <div class="code-container">
      <div class="code">${code}</div>
      <div class="expire-note">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <polyline points="12 6 12 12 16 14" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Code expires in ${expiresInMinutes} minutes</span>
      </div>
    </div>

    <p class="instructions" style="font-size: 13px; color: #94a3b8;">
      If you did not request this code, you can safely ignore this email. Your current password will remain unchanged.
    </p>

    <div class="footer">
      Otter • Real-time Multiplayer Gaming & Social Network
    </div>
  </div>
</body>
</html>
`;

    // 1. Prioritize Resend HTTP API if configured (Port 443 HTTPS - Works 100% on cloud platforms like Railway where SMTP is blocked)
    if (resendApiKey) {
      try {
        const resendRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [toEmail],
            subject: `Your Verification Code: ${code} - Otter`,
            html: htmlContent,
          }),
        });

        const data: any = await resendRes.json();
        if (resendRes.ok) {
          console.log(`[EmailService] Verification code successfully sent to ${toEmail} via Resend HTTP API`);
          return { sent: true, message: 'Verification email sent successfully' };
        } else {
          console.error(`[EmailService] Resend API error:`, data);
          return { sent: false, message: data.message || 'Resend API failed to send' };
        }
      } catch (err: any) {
        console.error(`[EmailService] Resend HTTP call failed:`, err.message);
        return { sent: false, message: err.message };
      }
    }

    const transporter = this.getTransporter();

    // If no email provider is configured yet, log to console for development testing
    if (!transporter) {
      console.log('----------------------------------------------------');
      console.log(`[EmailService] (Dev Fallback - No Email Provider Configured)`);
      console.log(`To: ${toEmail} (@${username})`);
      console.log(`Password Reset Verification Code: [ ${code} ]`);
      console.log(`Expires in: ${expiresInMinutes} minutes`);
      console.log('----------------------------------------------------');
      return {
        sent: false,
        message: 'Email service unconfigured. Code logged to server console for testing.',
      };
    }

    // Resolve app icon image
    const possibleIconPaths = [
      path.resolve(process.cwd(), 'assets/app-icon.png'),
      path.resolve(__dirname, '../../assets/app-icon.png'),
      path.resolve(__dirname, '../../../assets/app-icon.png'),
      path.resolve(__dirname, '../../../../mobile/assets/icon.png'),
    ];
    const resolvedIconPath = possibleIconPaths.find((p) => fs.existsSync(p));

    const attachments = resolvedIconPath
      ? [
          {
            filename: 'app-icon.png',
            path: resolvedIconPath,
            cid: 'applogo',
          },
        ]
      : [];

    try {
      const sendPromise = transporter.sendMail({
        from: fromAddress,
        to: toEmail,
        subject: `Your Verification Code: ${code} - Otter`,
        text: `Hey ${username},\n\nYour password reset code is: ${code}\n\nThis code expires in ${expiresInMinutes} minutes.\n\nIf you did not request a password reset, please ignore this email.`,
        html: htmlContent,
        attachments,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                'SMTP connection timed out (outbound SMTP ports 465/587 are blocked on cloud hosts like Railway).'
              )
            ),
          7000
        )
      );

      await Promise.race([sendPromise, timeoutPromise]);

      console.log(`[EmailService] Password reset verification email successfully sent to ${toEmail}`);
      return { sent: true, message: 'Verification email sent successfully' };
    } catch (err: any) {
      console.error(`[EmailService] Failed to send email to ${toEmail}:`, err.message);
      return { sent: false, message: `Failed to deliver email: ${err.message}` };
    }
  }
}
