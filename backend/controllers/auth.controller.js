import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Logger } from "../utils/logger.js";
import { EmailService } from "../services/email.service.js";

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

export const signup = async (req, res) => {
    try {
        let { fullName, username, email, password, dateOfBirth } = req.body;

        // Validation
        if (!fullName || !username || !email || !password) {
            return res.status(400).json({ error: "All fields are required" });
        }

        // Email normalization
        email = email.toLowerCase().trim();
        username = username.trim();

        // Email format check
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        // Password strength check (min 8 chars, 1 letter, 1 number)
        if (password.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }
        if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
            return res.status(400).json({ error: "Password must contain both letters and numbers" });
        }

        // Check if user exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists with this email or username" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Generate OTP
        const otp = generateOTP();
        const otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

        // Create user
        const user = new User({
            fullName,
            username,
            email,
            password: hashedPassword,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            otp,
            otpExpires,
            isVerified: false
        });

        await user.save();

        // Send OTP
        await EmailService.sendOTP(email, otp, 'verification');

        Logger.success(`New user registered (unverified): ${username}`);
        res.status(201).json({
            success: true,
            message: "Registration successful. Please verify your email with the OTP sent.",
            email: email
        });
    } catch (err) {
        Logger.error("Signup failure details:", err);
        res.status(500).json({ error: "Signup failed", message: err.message });
    }
};

export const verifyEmail = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired OTP" });
        }

        user.isVerified = true;
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        // Generate JWT
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        Logger.success(`Email verified for: ${user.email}`);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                isVerified: user.isVerified,
                passwordLastChanged: user.passwordLastChanged,
                defaultCloud: user.defaultCloud,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Verification failed", message: err.message });
    }
};

export const resendOTP = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.isVerified) return res.status(400).json({ error: "Email already verified" });

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        await EmailService.sendOTP(user.email, otp, 'verification');
        res.json({ success: true, message: "New OTP sent to your email" });
    } catch (err) {
        res.status(500).json({ error: "Failed to resend OTP" });
    }
};

export const login = async (req, res) => {
    try {
        let { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        email = email.toLowerCase().trim();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        // Check if verified
        if (!user.isVerified) {
            return res.status(403).json({
                error: "Please verify your email before logging in",
                unverified: true
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ error: "Invalid credentials" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

        Logger.success(`User logged in: ${user.username}`);
        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                username: user.username,
                email: user.email,
                isVerified: user.isVerified,
                passwordLastChanged: user.passwordLastChanged,
                defaultCloud: user.defaultCloud,
                createdAt: user.createdAt
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Login failed", message: err.message });
    }
};

export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            // Security: don't reveal if user exists, but here we can be helpful for now
            return res.status(404).json({ error: "If an account exists with this email, a reset code has been sent." });
        }

        const otp = generateOTP();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        await EmailService.sendOTP(user.email, otp, 'reset');
        res.json({ success: true, message: "Reset code sent to your email" });
    } catch (err) {
        res.status(500).json({ error: "Password reset request failed" });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (newPassword.length < 8) {
            return res.status(400).json({ error: "Password must be at least 8 characters long" });
        }

        const user = await User.findOne({
            email: email.toLowerCase().trim(),
            otp,
            otpExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: "Invalid or expired reset code" });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.passwordLastChanged = Date.now();
        user.otp = undefined;
        user.otpExpires = undefined;
        await user.save();

        Logger.success(`Password reset successful for: ${user.email}`);
        res.json({
            success: true,
            message: "Password reset successful. You can now log in.",
            passwordLastChanged: user.passwordLastChanged
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to reset password" });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: "User not found" });

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) return res.status(400).json({ error: "Current password is incorrect" });

        if (newPassword.length < 8) {
            return res.status(400).json({ error: "New password must be at least 8 characters long" });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        user.passwordLastChanged = Date.now();
        await user.save();

        Logger.success(`Password changed by user: ${user.username}`);
        res.json({
            success: true,
            message: "Password updated successfully",
            passwordLastChanged: user.passwordLastChanged
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to change password" });
    }
};
