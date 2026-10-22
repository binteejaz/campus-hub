// src/services/email.service.ts
import nodemailer from 'nodemailer';
import { logger } from '../config/logger';

class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!process.env.EMAIL_USER) {
      logger.debug(`[Email stub] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'CampusHub <no-reply@campushub.edu>',
        to,
        subject,
        html,
      });
      logger.info(`Email sent to ${to}: ${subject}`);
    } catch (err) {
      logger.error(`Email send failed to ${to}:`, err);
    }
  }

  async sendVerification(to: string, token: string): Promise<void> {
    const url = `${process.env.CLIENT_URL}/verify-email/${token}`;
    await this.send(to, 'Verify your CampusHub email', `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
        <h1 style="color:#C8F135;">🎓 Welcome to CampusHub!</h1>
        <p>Click the button below to verify your email address:</p>
        <a href="${url}" style="display:inline-block;background:#C8F135;color:#0F0F14;padding:.75rem 1.5rem;border-radius:50px;text-decoration:none;font-weight:700;margin:1rem 0;">Verify Email</a>
        <p style="color:#888;font-size:.85rem;">Link expires in 24 hours. If you didn't sign up, ignore this email.</p>
      </div>
    `);
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${process.env.CLIENT_URL}/reset-password/${token}`;
    await this.send(to, 'Reset your CampusHub password', `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
        <h1 style="color:#C8F135;">🔐 Password Reset</h1>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click below:</p>
        <a href="${url}" style="display:inline-block;background:#C8F135;color:#0F0F14;padding:.75rem 1.5rem;border-radius:50px;text-decoration:none;font-weight:700;margin:1rem 0;">Reset Password</a>
        <p style="color:#888;font-size:.85rem;">Link expires in 1 hour. If you didn't request this, ignore this email.</p>
      </div>
    `);
  }

  async sendEventReminder(to: string, name: string, eventTitle: string, startTime: Date): Promise<void> {
    await this.send(to, `Reminder: ${eventTitle} starts soon`, `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:2rem;">
        <h1 style="color:#C8F135;">📅 Event Reminder</h1>
        <p>Hi ${name},</p>
        <p><strong>${eventTitle}</strong> starts at ${startTime.toLocaleString()}.</p>
        <p>Don't forget to attend!</p>
      </div>
    `);
  }
}

export const emailService = new EmailService();
