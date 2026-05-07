import nodemailer from "nodemailer";
import { Logger } from "../utils/logger.js";

/**
 * Service to handle all email communications using Nodemailer.
 */
export const EmailService = {
    /**
     * Sends a 6-digit OTP to the user's email.
     * @param {string} email - Destination email address
     * @param {string} otp - The 6-digit code
     * @param {string} type - 'verification' or 'reset'
     */
    sendOTP: async (email, otp, type = 'verification') => {
        try {
            // Configure transporter
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: parseInt(process.env.SMTP_PORT || '465'),
                secure: true, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            const subject = type === 'verification'
                ? "SynCloud: Verify Your Email"
                : "SynCloud: Password Reset Code";

            const message = type === 'verification'
                ? `Welcome to SynCloud! Your verification code is: ${otp}`
                : `You requested a password reset. Your reset code is: ${otp}`;

            // Send mail
            const info = await transporter.sendMail({
                from: process.env.SMTP_FROM || `"SynCloud" <${process.env.SMTP_USER}>`,
                to: email,
                subject: subject,
                text: message,
                html: `<div style="font-family: Arial, sans-serif; padding: 20px;">
                        <h2>${subject}</h2>
                        <p>${message.split(': ')[0]}:</p>
                        <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
                        <p>This code will expire in 10 minutes.</p>
                      </div>`,
            });

            Logger.info(`Email sent successfully: ${info.messageId}`);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            Logger.error("Failed to send email:", error);
            // Fallback: Simulation log in development if SMTP fails
            console.log("\n--- 📧 EMAIL SENDING FAILED (FALLBACK TO LOG) ---");
            console.log(`To: ${email}`);
            console.log(`Error: ${error.message}`);
            console.log("------------------------------------\n");
            return { success: false, error: error.message };
        }
    }
};
