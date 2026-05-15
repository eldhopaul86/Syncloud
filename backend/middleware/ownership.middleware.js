import { FileMetadata } from "../models/FileMetadata.js";
import { Logger } from "../utils/logger.js";

/**
 * Middleware to verify file ownership
 * Rejects access if the file does not belong to the authenticated user
 */
export const verifyFileOwnership = async (req, res, next) => {
    try {
        const fileId = req.params.id || req.params.fileId;
        const userId = req.user.id;

        if (!fileId) {
            return res.status(400).json({ error: "File ID is required" });
        }

        const file = await FileMetadata.findById(fileId);

        if (!file) {
            Logger.warn(`Ownership check failed: File ${fileId} not found`);
            return res.status(404).json({ error: "File not found" });
        }

        // Ownership verification logic
        if (file.owner.toString() !== userId) {
            Logger.warn(`Security Violation: User ${userId} attempted to access file ${fileId} owned by ${file.owner}`);
            return res.status(403).json({
                message: "Unauthorized: file does not belong to this user"
            });
        }

        // Attach file to request for possible use in controllers
        req.fileMetadata = file;
        next();
    } catch (err) {
        Logger.error("Ownership middleware error", err.message);
        res.status(500).json({ error: "Ownership verification failed" });
    }
};
