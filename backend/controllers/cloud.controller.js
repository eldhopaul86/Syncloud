import cloudManagerService from "../services/cloudManager.service.js";
import { CloudCredential } from "../models/CloudCredential.js";
import { Logger } from "../utils/logger.js";

/**
 * Validates and saves cloud credentials
 */
export const addCloudCredential = async (req, res) => {
    try {
        const { cloudName, credentials } = req.body;
        const userId = req.user.id;

        if (!cloudName || !credentials) {
            return res.status(400).json({ error: "cloudName and credentials are required" });
        }

        const doc = await cloudManagerService.connectCloud(userId, cloudName, credentials);

        Logger.success(`✅ Cloud ${cloudName} credentials stored/updated for user ${req.user.username} in cloud_credential collection (ID: ${doc._id})`);
        res.json({
            success: true,
            message: `${cloudName} connected successfully`,
            credentialId: doc._id
        });
    } catch (err) {
        Logger.error("Failed to connect cloud provider", err.message);
        res.status(400).json({ error: err.message });
    }
};

/**
 * Tests credentials without saving
 */
export const testCloudCredentials = async (req, res) => {
    try {
        const { cloudName, credentials } = req.body;
        const isValid = await cloudManagerService.testCredentials(cloudName, credentials);

        if (isValid) {
            res.json({ success: true, message: "Credentials are valid" });
        } else {
            res.status(400).json({ success: false, message: "Invalid credentials" });
        }
    } catch (err) {
        Logger.error(`Credential test failed:`, err.message);
        res.status(400).json({
            success: false,
            message: err.message || "Failed to validate credentials"
        });
    }
};

/**
 * Retrieves list of connected clouds (securely)
 */
export const getCloudCredentials = async (req, res) => {
    try {
        const userId = req.user.id;
        // Don't return the encrypted credentials string to the frontend
        const connections = await CloudCredential.find({ userId }).select("-credentials");
        res.json({ success: true, connections });
    } catch (err) {
        Logger.error("Failed to fetch cloud connections", err.message);
        res.status(500).json({ error: "Failed to fetch cloud connections" });
    }
};
