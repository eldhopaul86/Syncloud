import { CloudCredential } from "../models/CloudCredential.js";
import { FileMetadata } from "../models/FileMetadata.js";
import { encrypt, encryptJSON, decryptJSON } from "../utils/encryption.service.js";
import { generateSHA256 } from "../utils/hashing.service.js";
import cloudStorageFactory from "./cloudStorage.factory.js";
import { Logger } from "../utils/logger.js";

/**
 * CloudManager Service
 * Orchestrates credential management and multi-cloud uploads
 */
class CloudManagerService {
    /**
     * Validates and saves cloud credentials for a user
     */
    async connectCloud(userId, cloudName, credentials) {
        const service = cloudStorageFactory.getService(cloudName);

        // 1. Mandatory validation before saving
        const isValid = await service.validateCredentials(credentials);
        if (!isValid) {
            throw new Error(`Invalid credentials for ${cloudName}`);
        }

        // 2. Encrypt and store
        const encryptedCreds = encryptJSON(credentials);

        Logger.info(`💾 Saving credentials to DB for user: ${userId}, cloud: ${cloudName}`);

        const doc = await CloudCredential.findOneAndUpdate(
            { userId, cloudName },
            {
                userId, // Explicitly include for upsert
                cloudName, // Explicitly include for upsert
                credentials: encryptedCreds,
                isValidated: true
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (doc) {
            Logger.success(`✅ Credential document saved/updated: ${doc._id}`);
        } else {
            Logger.error(`❌ Failed to save credential document to DB`);
        }

        return doc;
    }

    /**
     * Retrieves and decrypts credentials for a specific provider
     */
    async getUserCredentials(userId, cloudName) {
        Logger.info(`🔍 Searching credentials for User: ${userId}, Cloud: ${cloudName}`);
        const doc = await CloudCredential.findOne({ userId, cloudName });
        if (!doc) {
            Logger.info(`❌ No credentials found in DB for ${cloudName} (User: ${userId})`);
            return null;
        }
        try {
            const decrypted = decryptJSON(doc.credentials);
            Logger.success(`✅ Found and decrypted credentials for ${cloudName}`);
            return decrypted;
        } catch (err) {
            Logger.error(`❌ Failed to decrypt credentials for ${cloudName}:`, err.message);
            return null;
        }
    }

    /**
     * Orchestrates the upload process with enhanced metadata and optional encryption
     */
    async upload(userId, cloudName, fileData) {
        const {
            originalName,
            buffer,
            mimetype,
            importanceScore,
            importanceReason,
            isEncrypted,
            aesKey,      // Client-side generated key (if encrypted)
            iv,           // Client-side generated IV (if encrypted)
            priority,
            reason,
            lastModified,
            parentFolderId
        } = fileData;

        // Generate SHA-256 Hash from Binary Buffer (Requirement 1 & 2)
        const sha256 = generateSHA256(buffer);

        // 1. Try to get user-specific credentials
        let credentials = await this.getUserCredentials(userId, cloudName);

        if (!credentials) {
            Logger.error(`🚫 Upload Denied: No credentials found for user ${userId} on ${cloudName}`);
            throw new Error(`Cloud provider credentials not found for ${cloudName}. Please set them up in the Cloud Setup screen.`);
        }

        // CASE 1: Exact Duplicate (User-level)
        const existingByHash = await FileMetadata.findOne({ userId, hash: sha256 });
        if (existingByHash) {
            Logger.info(`♻️ CASE 1: Exact duplicate found for user ${userId} (Hash: ${sha256}). Skipping upload.`);
            return {
                result: {
                    url: existingByHash.url,
                    publicId: existingByHash.publicId,
                    size: existingByHash.fileSize,
                    mimeType: existingByHash.fileType
                },
                metadata: existingByHash,
                deduplicated: true,
                version: existingByHash.version
            };
        }

        // CASE 2: Same Filename, Different Content (User-level)
        const existingByName = await FileMetadata.findOne({
            userId,
            fileName: originalName,
            parentFolderId: parentFolderId || null
        });

        let isUpdate = false;
        if (existingByName && existingByName.hash !== sha256) {
            Logger.info(`🆕 CASE 2: Filename ${originalName} exists with new content. Replacing old version...`);

            // Delete old file from cloud storage
            try {
                const oldService = cloudStorageFactory.getService(existingByName.cloud);
                const oldCreds = await this.getUserCredentials(userId, existingByName.cloud);
                if (oldService && existingByName.publicId && oldCreds) {
                    await oldService.deleteFile(existingByName.publicId, oldCreds);
                    Logger.info(`🗑️ Old cloud file deleted: ${existingByName.publicId}`);
                }
            } catch (err) {
                Logger.info(`⚠️ Note: Could not delete old cloud file during replacement: ${err.message}`);
            }
            isUpdate = true;
        }

        const service = cloudStorageFactory.getService(cloudName);
        if (!service) {
            throw new Error(`Unsupported cloud provider: ${cloudName}`);
        }

        try {
            // 4. Perform upload 
            const result = await service.uploadFile(originalName, buffer, mimetype, credentials);

            // 5. Securely handle the AES key if encryption was enabled
            let securedAesKey = null;
            if (isEncrypted && aesKey) {
                securedAesKey = encrypt(aesKey);
            }

            // 6. Save or Update metadata
            let metadata;
            if (isUpdate && existingByName) {
                // CASE 2: Update existing record
                existingByName.fileSize = result.size || buffer.length;
                existingByName.fileType = result.mimeType || mimetype;
                existingByName.cloud = cloudName;
                existingByName.url = result.url;
                existingByName.publicId = result.publicId;
                existingByName.importanceScore = importanceScore;
                existingByName.importanceReason = importanceReason;
                existingByName.scanStatus = fileData.scanStatus || "pending";
                existingByName.scanResult = fileData.scanResult;
                existingByName.hash = sha256;
                existingByName.encrypted = isEncrypted === true || isEncrypted === "true";
                existingByName.aesKey = securedAesKey;
                existingByName.iv = iv;
                existingByName.lastModified = lastModified || new Date();
                existingByName.version = (existingByName.version || 1) + 1;
                existingByName.uploadTimestamp = new Date();

                metadata = await existingByName.save();
                Logger.success(`CASE 2 complete: File ${originalName} updated to version ${metadata.version}`);
            } else {
                // CASE 3: Create new record
                metadata = await FileMetadata.create({
                    userId,
                    fileName: originalName,
                    fileSize: result.size || buffer.length,
                    fileType: result.mimeType || mimetype,
                    cloud: cloudName,
                    url: result.url,
                    publicId: result.publicId,
                    folderPath: fileData.folderPath || "/",
                    parentFolderId: parentFolderId,
                    version: 1, // Start at version 1
                    priority: priority || "normal",
                    reason: reason || importanceReason,
                    lastModified: lastModified || new Date(),
                    hash: sha256,
                    encrypted: isEncrypted === true || isEncrypted === "true",
                    aesKey: securedAesKey,
                    iv,
                    importanceScore,
                    importanceReason,
                    scanStatus: fileData.scanStatus || "pending",
                    scanResult: fileData.scanResult,
                    uploadTimestamp: new Date()
                });
                Logger.success(`CASE 3 complete: File ${originalName} uploaded as new file`);
            }

            return { result, metadata, updated: isUpdate, deduplicated: false };
        } catch (error) {
            Logger.error(`Upload to ${cloudName} failed:`, error.message);
            throw error;
        }
    }

    /**
     * Optional: Test credentials without saving
     */
    async testCredentials(cloudName, credentials) {
        const service = cloudStorageFactory.getService(cloudName);
        return await service.validateCredentials(credentials);
    }
}

export default new CloudManagerService();
