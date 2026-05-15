import geminiService from "../services/gemini.service.js";
import cloudManagerService from "../services/cloudManager.service.js";
import { GEMINI_CONFIG } from "../config/gemini.config.js";
import virustotalService from "../services/virustotal.service.js";
import { Logger } from "../utils/logger.js";
import { AnalysisCache } from "../models/AnalysisCache.js";

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

    // 1. Calculate Hash (Foundation for Security & Deduplication)
    const { sha256: bodySha256 } = req.body;
    let fileHash = bodySha256;
    if (!fileHash && req.file.buffer) {
      const { generateSHA256 } = await import("../utils/hashing.service.js");
      fileHash = generateSHA256(req.file.buffer);
    }

    // 2. Threat Detection FIRST (Security Requirement)
    Logger.info(`🔍 Performing priority threat scan for: ${req.file.originalname}`);
    let scanResult = null;
    let scanStatus = 'pending';

    try {
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

    // BLOCK if malicious BEFORE deduplication or AI
    const bypassThreat = req.body?.bypassThreat === "true" || req.body?.bypassThreat === true;
    if (scanResult && (scanResult.malicious > 0 || scanResult.suspicious > 0) && !bypassThreat) {
      Logger.warn(`🚫 Threat detected in ${req.file.originalname}. Pausing upload for security.`);
      return res.status(409).json({
        status: "threat_detected",
        message: "Malicious content detected by VirusTotal",
        scanResult
      });
    }

    // 3. Deduplication check (Optimization)
    const deduplicationResult = await cloudManagerService.checkDeduplication(req.user.id, fileHash);
    
    if (deduplicationResult) {
      Logger.info(`♻️ Early Deduplication: Skipping Gemini for ${req.file.originalname} (Hash: ${fileHash})`);
      return res.json({
        status: "success",
        message: "Identical file already exists. Skipping upload.",
        fileId: deduplicationResult.metadata._id,
        version: deduplicationResult.version,
        duplicate: true,
        cloud,
        shareUrl: deduplicationResult.url,
        importanceReason: deduplicationResult.metadata.importanceReason,
        importanceScore: deduplicationResult.metadata.importanceScore,
        scanStatus: deduplicationResult.metadata.scanStatus,
        scanResult: deduplicationResult.metadata.scanResult
      });
    }

    // 4. Check file importance with Gemini (Only if NOT a duplicate and NOT malicious)
    // Check Analysis Cache first
    let importanceCheck = null;
    const isEncrypted = req.body?.encrypted === "true" || req.body?.encrypted === true;
    const cachedAnalysis = await AnalysisCache.findOne({ hash: fileHash });

    if (cachedAnalysis) {
      Logger.info(`🧠 Analysis Cache Hit: Using existing score ${cachedAnalysis.score} for ${req.file.originalname}`);
      importanceCheck = {
        score: cachedAnalysis.score,
        reason: cachedAnalysis.reason,
        isImportant: cachedAnalysis.score >= GEMINI_CONFIG.IMPORTANCE_THRESHOLD && cachedAnalysis.score <= 10,
        decision: "CACHED"
      };
    } else {
      importanceCheck = await geminiService.analyzeFile(
        req.file.originalname,
        req.file.buffer,
        isEncrypted
      );

      // Save to cache if analysis was successful
      if (importanceCheck && importanceCheck.score !== null && importanceCheck.score !== -1) {
        try {
          await AnalysisCache.create({
            hash: fileHash,
            score: importanceCheck.score,
            reason: importanceCheck.reason,
            fileName: req.file.originalname,
            modelUsed: GEMINI_CONFIG.MODEL
          });
          Logger.info(`💾 Analysis result cached for ${req.file.originalname}`);
        } catch (cacheErr) {
          Logger.error("Failed to save analysis to cache", cacheErr.message);
        }
      }
    }

    const forceUpload = req.body?.forceUpload === "true" || req.body?.forceUpload === true;
    const isAutoBackup = req.body?.isAutoBackup === "true" || req.body?.isAutoBackup === true;
    const score = importanceCheck.score;

    if (isAutoBackup && !forceUpload) {
      if (score < 5) {
        Logger.info(`⛔ Auto-Backup rejected: Score ${score} < 5 (${req.file.originalname})`);
        return res.json({
          status: "rejected",
          message: "File not important enough for automatic backup",
          score,
          reason: importanceCheck.reason
        });
      }

      // 5. Ownership Verification (Security & Privacy Requirement)
      if (req.user.ownershipVerificationEnabled && !isEncrypted) {
        Logger.info(`🛡️ Performing ownership verification for: ${req.file.originalname}`);
        const ownershipService = (await import("../services/ownership.service.js")).default;
        const verification = await ownershipService.verify(req.user, req.file.buffer, req.file.originalname);
        
        if (!verification.isMatch) {
          Logger.warn(`🛡️ Ownership mismatch for ${req.file.originalname} (Score: ${verification.score}%)`);
          
          // If importance score is high enough to be considered for backup, ask user
          if (score >= 5) {
            return res.json({
              status: "ownership_mismatch",
              message: "Ownership verification failed: This file may not belong to you.",
              score: score,
              ownershipScore: verification.score,
              importanceReason: importanceCheck.reason,
              verificationReason: verification.reason
            });
          } else {
            // If low importance AND ownership mismatch, definitely reject
            return res.json({
              status: "rejected",
              message: "Automatic backup rejected: File not owned by user and low importance.",
              score,
              ownershipScore: verification.score,
              reason: "Ownership verification failed and importance score is low."
            });
          }
        }
        Logger.info(`🛡️ Ownership confirmed (${verification.score}%). Proceeding with backup.`);
      } else if (isEncrypted && req.user.ownershipVerificationEnabled) {
        Logger.info(`🛡️ Skipping ownership verification for encrypted file: ${req.file.originalname}`);
      }

      if (score >= 5 && score <= 7) {
        Logger.info(`⚠️ Auto-Backup pending: Score ${score} (5-7) (${req.file.originalname})`);
        return res.json({
          status: "pending_confirmation",
          message: "File importance is medium, awaiting user confirmation",
          score,
          reason: importanceCheck.reason
        });
      }
    }

    if (!importanceCheck.isImportant && !forceUpload && !isAutoBackup) {
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
      updated: !!updated,
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
