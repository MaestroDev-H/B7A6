import nodemailer from 'nodemailer';
import { env } from './env';

// A single reusable SMTP transporter (works with Gmail SMTP, Resend's SMTP
// bridge, Mailtrap, etc. - whatever SMTP_* is configured in .env).
export const transporter = nodemailer.createTransport({
    host: env.mail.host,
    port: env.mail.port,
    secure: env.mail.port === 465,
    auth: env.mail.user ? { user: env.mail.user, pass: env.mail.pass } : undefined,
});

export async function sendMail(to: string, subject: string, html: string): Promise<void> {
    if (!env.mail.host || !env.mail.user) {
        // No SMTP configured (e.g. local dev without credentials) - skip silently
        // rather than crashing the request that triggered the notification.
        console.log(`[mail:skipped - no SMTP configured] to=${to} subject="${subject}"`);
        return;
    }
    try {
        await transporter.sendMail({ from: env.mail.from, to, subject, html });
    } catch (err) {
        console.error('[mail] failed to send:', err);
    }
}
