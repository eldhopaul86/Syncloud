import { User } from "../models/User.js";
import { Logger } from "../utils/logger.js";

/**
 * Updates user settings like AES encryption toggle and default cloud
 */
export const updateUserSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { aesEncryptionEnabled, defaultCloud } = req.body;

        const updates = {};
        if (typeof aesEncryptionEnabled === "boolean") updates.aesEncryptionEnabled = aesEncryptionEnabled;
        if (defaultCloud) updates.defaultCloud = defaultCloud;

        const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select("-password");

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        Logger.success(`System settings updated for user: ${user.username}`);
        res.json({ success: true, user });
    } catch (err) {
        Logger.error("Failed to update user settings", err.message);
        res.status(500).json({ error: "Failed to update settings" });
    }
};

/**
 * Gets current user profile settings
 */
export const getUserSettings = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch settings" });
    }
};
