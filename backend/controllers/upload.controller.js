import geminiService from "../services/gemini.service.js";
import cloudManagerService from "../services/cloudManager.service.js";
import { GEMINI_CONFIG } from "../config/gemini.config.js";
import virustotalService from "../services/virustotal.service.js";
import { Logger } from "../utils/logger.js";

/**
 * Main upload controller using CloudManager orchestrator
 */
export async function uploadToSelectedCloud(req, res) {
  try {
    if (!req.file) {
      Logger.error("Upload attempt failed: No file object in request");
      return res.status(400).json({ error: "No file uploaded" });
    }

    const userDefaultCloud = req.user.defaultCloud || "cloudinary";
    const cloud = String(req.body?.cloud || "").toLowerCase().trim() || userDefaultCloud;

    Logger.info(`📂 Incoming Upload:`);
    Logger.info(`   - Name: ${req.file.originalname}`);
    Logger.info(`   - Size: ${req.file.size} bytes`);
    Logger.info(`   - Mime: ${req.file.mimetype}`);

    // Log the raw body too for filename debugging
    if (req.body.fileName) {
      Logger.info(`   - Body FileName: ${req.body.fileName}`);
    }
    Logger.info(`   - Target Cloud: ${cloud}`);
    Logger.info(`   - Folder ID: ${req.body.parentFolderId}`);

    // 1. Check file importance with Gemini
    const importanceCheck = await geminiService.analyzeFile(
      req.file.originalname,
      req.file.buffer
    );

    const forceUpload = req.body?.forceUpload === "true" || req.body?.forceUpload === true;

    if (!importanceCheck.isImportant && !forceUpload) {
      Logger.info(`⛔ Upload rejected to ${cloud} - File not important enough\n`);
      return res.status(400).json({
        error: "File deemed not important for cloud storage",
        reason: importanceCheck.reason,
        score: importanceCheck.score,
        threshold: GEMINI_CONFIG.IMPORTANCE_THRESHOLD,
        decision: importanceCheck.decision,
        rejected: true,
        cloud,
      });
    }

    if (forceUpload && !importanceCheck.isImportant) {
      Logger.info(`ℹ️ Manual Override: Allowing "unimportant" upload to ${cloud} (Score: ${importanceCheck.score})`);
    }

    // 2. VirusTotal Threat Detection (Hash check first)
    Logger.info(`🔍 Performing threat scan for: ${req.file.originalname}`);
    let scanResult = null;
    let scanStatus = 'pending';

    try {
      const fileHash = req.body.sha256;
      if (fileHash) {
        const existingReport = await virustotalService.checkFileHash(fileHash);
        if (existingReport) {
          scanResult = virustotalService.summarizeResults(existingReport);
          scanStatus = 'completed';
          Logger.info(`✅ VirusTotal report found. Malicious: ${scanResult.malicious}`);
        } else {
          // If not found by hash, perform an actual upload & scan
          Logger.info(`📤 File not known to VT. Uploading for scan...`);
          const analysisId = await virustotalService.uploadAndScanFile(req.file.buffer, req.file.originalname);
          if (analysisId) {
            scanStatus = 'scanning';
            Logger.info(`⏳ Scan initiated. Analysis ID: ${analysisId}`);
          }
        }
      }
    } catch (vtErr) {
      Logger.error("VirusTotal process failed", vtErr.message);
      scanStatus = 'failed';
    }

    // 3. Check for threats BEFORE upload unless bypassed
    const bypassThreat = req.body?.bypassThreat === "true" || req.body?.bypassThreat === true;
    if (scanResult && (scanResult.malicious > 0 || scanResult.suspicious > 0) && !bypassThreat) {
      Logger.warn(`🚫 Threat detected in ${req.file.originalname}. Pausing upload for user confirmation.`);
      return res.status(409).json({
        status: "threat_detected",
        message: "Malicious content detected by VirusTotal",
        scanResult
      });
    }

    // 4. Delegate to CloudManager for credential lookup, upload, and metadata persistence
    const {
      encrypted,
      aesKey,
      iv,
      sha256,
      folderPath,
      priority,
      reason,
      lastModified,
      version,
      parentFolderId,
      fileName
    } = req.body;

    // Normalize parentFolderId (handle string "null" from some clients)
    const normalizedParentId = (parentFolderId === "null" || !parentFolderId) ? null : parentFolderId;
    const finalFileName = fileName || req.file.originalname;

    const { result, metadata, updated, deduplicated } = await cloudManagerService.upload(
      req.user.id,
      cloud,
      {
        originalName: finalFileName,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        importanceScore: importanceCheck.score,
        importanceReason: importanceCheck.reason,
        isEncrypted: encrypted === "true" || encrypted === true,
        aesKey,
        iv,
        sha256,
        folderPath,
        priority,
        reason,
        lastModified,
        version,
        parentFolderId: normalizedParentId,
        scanStatus,
        scanResult
      }
    );

    let message = "File uploaded successfully";
    if (deduplicated) message = "Identical file already exists. Skipping upload.";
    else if (updated) message = "old file version is replaced by the modified file";

    return res.json({
      status: "success",
      message: message,
      fileId: metadata._id,
      version: metadata.version,
      duplicate: !!deduplicated,
      cloud,
      shareUrl: result.url,
      importanceReason: importanceCheck.reason,
      importanceScore: importanceCheck.score,
      scanStatus,
      scanResult,
      isMalicious: scanResult && (scanResult.malicious > 0 || scanResult.suspicious > 0)
    });
  } catch (err) {
    Logger.error("Upload failed", err.message);

    return res.status(500).json({
      error: err.message || "Upload failed",
      details: err.stack
    });
  }
}
