import { FileMetadata } from "../models/FileMetadata.js";
import { Logger } from "../utils/logger.js";
import { decrypt } from "../utils/encryption.service.js";
import mongoose from "mongoose";

/**
 * Lists all file metadata for the authenticated user
 */
export const getUserFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await FileMetadata.find({ userId }).sort({ uploadTimestamp: -1 });

        // Decrypt AES keys if they exist so frontend can decrypt files
        const processedFiles = files.map(file => {
            const fileObj = file.toObject();
            if (fileObj.encrypted && fileObj.aesKey) {
                try {
                    fileObj.aesKey = decrypt(fileObj.aesKey);
                } catch (e) {
                    Logger.error(`Failed to decrypt AES key for file ${fileObj._id}`, e.message);
                }
            }
            return fileObj;
        });

        res.json({ success: true, files: processedFiles });
    } catch (err) {
        Logger.error("Failed to fetch user files", err.message);
        res.status(500).json({ error: "Failed to fetch files" });
    }
};

/**
 * Deletes a file's metadata and (optionally) the file from cloud storage
 */
export const deleteFileMetadata = async (req, res) => {
    try {
        const userId = req.user.id;
        const fileId = req.params.id;

        const file = await FileMetadata.findOne({ _id: fileId, userId });

        if (!file) {
            return res.status(404).json({ error: "File not found" });
        }

        // If it's a folder, move children to root before deleting
        if (file.fileType === 'folder') {
            await FileMetadata.updateMany(
                { parentFolderId: fileId, userId },
                { $set: { parentFolderId: null } }
            );
            Logger.info(`Moved children of folder ${file.fileName} to root`);
        }

        await FileMetadata.deleteOne({ _id: fileId, userId });

        Logger.success(`Metadata deleted for ${file.fileType}: ${file.fileName}`);
        res.json({ success: true, message: "Deleted successfully" });
    } catch (err) {
        Logger.error("Failed to delete", err.message);
        res.status(500).json({ error: "Failed to delete" });
    }
};

/**
 * Fetches the most recent 5 files for the authenticated user
 */
export const getRecentFiles = async (req, res) => {
    try {
        const userId = req.user.id;
        const files = await FileMetadata.find({ userId, fileType: { $ne: 'folder' } })
            .sort({ uploadTimestamp: -1 })
            .limit(5);

        // Decrypt AES keys for recent files
        const processedFiles = files.map(file => {
            const fileObj = file.toObject();
            if (fileObj.encrypted && fileObj.aesKey) {
                try {
                    fileObj.aesKey = decrypt(fileObj.aesKey);
                } catch (e) {
                    Logger.error(`Failed to decrypt AES key for recent file ${fileObj._id}`, e.message);
                }
            }
            return fileObj;
        });

        res.json({ success: true, files: processedFiles });
    } catch (err) {
        Logger.error("Failed to fetch recent files", err.message);
        res.status(500).json({ error: "Failed to fetch recent files" });
    }
};

/**
 * Creates a new folder metadata entry
 */
export const createFolder = async (req, res) => {
    try {
        const { folderName, parentFolderId } = req.body;
        const userId = req.user.id;

        if (!folderName) {
            return res.status(400).json({ error: "Folder name is required" });
        }

        const folder = await FileMetadata.create({
            userId,
            fileName: folderName,
            fileSize: 0,
            fileType: "folder",
            cloud: "internal", // Folders are internal to our metadata system
            url: "folder",
            folderPath: "/", // Default for now
            parentFolderId: parentFolderId || null,
            uploadTimestamp: new Date()
        });

        Logger.success(`Folder created: ${folderName} for user ${req.user.username}`);
        res.json({ success: true, folder });
    } catch (err) {
        Logger.error("Failed to create folder", err.message);
        res.status(500).json({ error: "Failed to create folder" });
    }
};

/**
 * Calculates real-time stats for the home screen
 */
export const getFileStats = async (req, res) => {
    try {
        // IMPORTANT: Aggregation pipelines require ObjectIDs for $match, 
        // they do not automatically cast string IDs like standard find() queries.
        const userId = new mongoose.Types.ObjectId(req.user.id);
        const permanentDefault = (req.user.defaultCloud || 'cloudinary').toLowerCase();
        const requestedCloud = req.query.cloud || permanentDefault;
        const isAll = requestedCloud.toLowerCase() === 'all';
        const currentViewCloud = isAll ? 'all' : requestedCloud.toLowerCase();

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // Define capacities (in bytes)
        const capacities = {
            cloudinary: 5 * 1024 * 1024 * 1024, // 5GB
            googledrive: 15 * 1024 * 1024 * 1024, // 15GB
            mega: 20 * 1024 * 1024 * 1024, // 20GB
            dropbox: 2 * 1024 * 1024 * 1024 // 2GB
        };

        // helper for stats
        const fetchStatsForCloud = async (cloudName) => {
            const isAllCloud = cloudName === 'all';
            const normalizedCloud = cloudName.toLowerCase().trim();

            // Use case-insensitive regex for the cloud field to ensure consistency
            const cloudFilter = isAllCloud ? {} : { cloud: { $regex: new RegExp(`^${normalizedCloud}$`, 'i') } };

            const totalFiles = await FileMetadata.countDocuments({ userId, ...cloudFilter, fileType: { $ne: 'folder' } });
            const todayFiles = await FileMetadata.countDocuments({
                userId, ...cloudFilter, fileType: { $ne: 'folder' },
                uploadTimestamp: { $gte: startOfToday }
            });

            const threatCount = await FileMetadata.countDocuments({
                userId, ...cloudFilter, fileType: { $ne: 'folder' },
                'scanResult.malicious': { $gt: 0 }
            });

            const usageAggregation = await FileMetadata.aggregate([
                { $match: { userId, ...cloudFilter, fileType: { $ne: 'folder' } } },
                { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
            ]);
            const used = usageAggregation.length > 0 ? usageAggregation[0].totalSize : 0;

            let capacity;
            if (isAllCloud) {
                capacity = Object.values(capacities).reduce((a, b) => a + b, 0);
            } else {
                capacity = capacities[normalizedCloud] || (5 * 1024 * 1024 * 1024);
            }

            Logger.info(`📊 Stats for ${cloudName}: Used=${used}, Capacity=${capacity}, Remaining=${Math.max(0, capacity - used)}`);

            return {
                name: cloudName,
                totalFiles,
                todayFiles,
                threatCount,
                used,
                capacity,
                remaining: Math.max(0, capacity - used)
            };
        };

        // 1. Global Stats (Always system-wide)
        const globalTotalFiles = await FileMetadata.countDocuments({ userId, fileType: { $ne: 'folder' } });
        const globalTodayFiles = await FileMetadata.countDocuments({
            userId, fileType: { $ne: 'folder' },
            uploadTimestamp: { $gte: startOfToday }
        });
        const globalThreatCount = await FileMetadata.countDocuments({
            userId, fileType: { $ne: 'folder' },
            'scanResult.malicious': { $gt: 0 }
        });

        const globalUsageAggregation = await FileMetadata.aggregate([
            { $match: { userId, fileType: { $ne: 'folder' } } },
            { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
        ]);
        const globalTotalUsed = globalUsageAggregation.length > 0 ? globalUsageAggregation[0].totalSize : 0;

        // 2. Default Cloud Stats (Always user's permanent default)
        const defaultCloudStats = await fetchStatsForCloud(permanentDefault);

        // 3. View Cloud Stats (Based on filter)
        const viewCloudStats = await fetchStatsForCloud(currentViewCloud);

        // 5. Weekly Activity (Current Week: Monday - Sunday)
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
        // Adjust so Monday is index 0
        const diffToMonday = (dayOfWeek === 0) ? 6 : dayOfWeek - 1;

        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        // Calculate timezone offset for MongoDB aggregation
        const offset = now.getTimezoneOffset(); // in minutes
        const hours = Math.floor(Math.abs(offset) / 60);
        const mins = Math.abs(offset) % 60;
        const sign = offset > 0 ? "-" : "+"; // sign is inverted in getTimezoneOffset
        const tzString = `${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;

        const viewFilter = isAll ? {} : { cloud: { $regex: new RegExp(`^${currentViewCloud}$`, 'i') } };
        const weeklyAggregation = await FileMetadata.aggregate([
            {
                $match: {
                    userId,
                    ...viewFilter,
                    fileType: { $ne: 'folder' },
                    uploadTimestamp: { $gte: startOfWeek }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$uploadTimestamp", timezone: tzString } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        const weeklyData = [];
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);

            // Format to YYYY-MM-DD manually to match local date
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const found = weeklyAggregation.find(item => item._id === dateStr);
            weeklyData.push(found ? found.count : 0);
        }

        res.json({
            success: true,
            stats: {
                global: {
                    totalFiles: globalTotalFiles,
                    todayFiles: globalTodayFiles,
                    totalUsed: globalTotalUsed,
                    threatCount: globalThreatCount
                },
                defaultCloud: defaultCloudStats,
                viewCloud: viewCloudStats,
                weeklyActivity: weeklyData
            }
        });
    } catch (err) {
        Logger.error("Failed to fetch file stats", err.message);
        res.status(500).json({ error: "Failed to fetch stats" });
    }
};

/**
 * Moves a file or folder to a different parent folder
 */
export const moveFile = async (req, res) => {
    try {
        const { fileId, targetFolderId } = req.body;
        const userId = req.user.id;

        if (!fileId) {
            return res.status(400).json({ error: "File ID is required" });
        }

        // targetFolderId can be null (moving to root)
        const update = { parentFolderId: targetFolderId || null };

        const file = await FileMetadata.findOneAndUpdate(
            { _id: fileId, userId },
            update,
            { new: true }
        );

        if (!file) {
            return res.status(404).json({ error: "File or folder not found" });
        }

        Logger.success(`Moved ${file.fileName} to ${targetFolderId || 'root'} for user ${req.user.username}`);
        res.json({ success: true, message: "Moved successfully", file });
    } catch (err) {
        Logger.error("Failed to move file", err.message);
        res.status(500).json({ error: "Failed to move file" });
    }
};
/**
 * Renames a file or folder
 */
export const renameFile = async (req, res) => {
    try {
        const { newName } = req.body;
        const fileId = req.params.id;
        const userId = req.user.id;

        if (!newName) {
            return res.status(400).json({ error: "New name is required" });
        }

        const file = await FileMetadata.findOneAndUpdate(
            { _id: fileId, userId },
            { $set: { fileName: newName } },
            { new: true }
        );

        if (!file) {
            return res.status(404).json({ error: "File or folder not found" });
        }

        Logger.success(`Renamed ${file.fileType} from ${fileId} to ${newName} for user ${req.user.username}`);
        res.json({ success: true, message: "Renamed successfully", file });
    } catch (err) {
        Logger.error("Failed to rename file", err.message);
        res.status(500).json({ error: "Failed to rename file" });
    }
};
/**
 * Checks for deduplication or modification before actual upload
 */
export const checkDedupe = async (req, res) => {
    try {
        const { fileName, hash, parentFolderId } = req.body;
        const userId = req.user.id;

        // Normalize parentFolderId (handle string "null" from some clients)
        const normalizedParentId = (parentFolderId === "null" || !parentFolderId) ? null : parentFolderId;

        Logger.info(`🔍 Checking dedupe for ${fileName} (Hash: ${hash?.substring(0, 10)}...) in folder: ${normalizedParentId}`);

        if (!hash) {
            return res.status(400).json({ error: "File hash is required for deduplication check" });
        }

        // Deduplication disabled - Always return false
        res.json({
            success: true,
            deduplicated: false,
            needsUpdate: false
        });

    } catch (err) {
        Logger.error("Deduplication check failed", err.message);
        res.status(500).json({ error: "Failed to check deduplication" });
    }
};
