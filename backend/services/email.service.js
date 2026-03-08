import { Logger } from "../utils/logger.js";

/**
 * Service to handle all email communications.
 * In production, this would use a service like SendGrid, Mailgun, or Nodemailer.
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
            // Placeholder: Log to terminal for local development
            const subject = type === 'verification'
                ? "SynCloud: Verify Your Email"
                : "SynCloud: Password Reset Code";

            const message = type === 'verification'
                ? `Welcome to SynCloud! Your verification code is: ${otp}`
                : `You requested a password reset. Your reset code is: ${otp}`;

            console.log("\n--- 📧 OUTGOING EMAIL SIMULATION ---");
            console.log(`To: ${email}`);
            console.log(`Subject: ${subject}`);
            console.log(`Body: ${message}`);
            console.log("------------------------------------\n");

            // Mocking a slight delay for network latency
            await new Promise(resolve => setTimeout(resolve, 500));

            return { success: true };
        } catch (error) {
            Logger.error("Failed to send email:", error);
            return { success: false, error: error.message };
        }
    }
};
