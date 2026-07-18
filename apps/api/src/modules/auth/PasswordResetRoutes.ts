import express, { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import pool from '../../db/pool';

const router = express.Router();

/**
 * /api/auth/forgot-password  — request a reset
 * /api/auth/reset-password   — use token to set new password
 */

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const { rows } = await pool.query(
            `SELECT id, name, tenant_id FROM users WHERE LOWER(email) = LOWER($1) AND is_active = TRUE`, [email]
        );

        // Always return success to prevent email enumeration
        if (!rows[0]) {
            return res.json({ message: 'If this email exists, a reset link has been sent.' });
        }

        const user = rows[0];

        // Generate reset token — 32 bytes
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetHash = await bcrypt.hash(resetToken, 8);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        // Store in DB (reuse refresh_tokens table with a special convention)
        await pool.query(
            `DELETE FROM refresh_tokens WHERE user_id = $1 AND token_hash LIKE 'RESET:%'`, [user.id]
        );
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
            [user.id, `RESET:${resetHash}`, expiresAt]
        );

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&uid=${user.id}`;

        // Try email delivery
        try {
            if (process.env.SMTP_HOST && process.env.SMTP_USER) {
                const transporter = nodemailer.createTransport({
                    host: process.env.SMTP_HOST,
                    port: parseInt(process.env.SMTP_PORT as string) || 587,
                    secure: process.env.SMTP_SECURE === 'true',
                    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
                });
                await transporter.sendMail({
                    from: `"${process.env.SMTP_FROM_NAME || 'ZentrixCRM'}" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: 'Reset your ZentrixCRM password',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
                            <h2>Password Reset</h2>
                            <p>Hi ${user.name},</p>
                            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
                            <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #6366f1; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password</a>
                            <p style="color: #888; font-size: 0.85rem; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
                        </div>
                    `,
                });
            } else {
                // SMTP not configured — log the reset URL for dev
                console.log(`\n🔗 Password reset link for ${email}:\n${resetUrl}\n`);
            }
        } catch (emailErr: any) {
            console.error('Email send error:', emailErr.message);
            console.log(`\n🔗 Password reset link for ${email}:\n${resetUrl}\n`);
        }

        res.json({ message: 'If this email exists, a reset link has been sent.' });
    } catch (err) {
        console.error('forgot-password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
    try {
        const { token, uid, password } = req.body;
        if (!token || !uid || !password) {
            return res.status(400).json({ error: 'Token, user ID, and new password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        // Find the reset token
        const { rows } = await pool.query(
            `SELECT * FROM refresh_tokens WHERE user_id = $1 AND token_hash LIKE 'RESET:%' AND expires_at > NOW()`,
            [uid]
        );

        if (!rows.length) {
            return res.status(400).json({ error: 'Invalid or expired reset link. Please request a new one.' });
        }

        // Verify token against stored hash
        const storedHash = rows[0].token_hash.replace('RESET:', '');
        const isValid = await bcrypt.compare(token, storedHash);
        if (!isValid) {
            return res.status(400).json({ error: 'Invalid reset token' });
        }

        // Update password
        const newHash = await bcrypt.hash(password, 12);
        await pool.query(`UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [newHash, uid]);

        // Clean up reset tokens
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1 AND token_hash LIKE 'RESET:%'`, [uid]);

        // Also invalidate all existing refresh tokens (force re-login everywhere)
        await pool.query(`DELETE FROM refresh_tokens WHERE user_id = $1`, [uid]);

        res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
    } catch (err) {
        console.error('reset-password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

export default router;
