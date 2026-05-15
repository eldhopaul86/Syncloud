import { Logger } from "../utils/logger.js";
import { OcrService } from "./ocr.service.js";
import { TextExtractor } from "../utils/text.extractor.js";
import { MatchingService } from "./matching.service.js";
import fs from "fs";
import path from "path";
import os from "os";

class OwnershipService {
    /**
     * Verifies if the document belongs to the user
     * @param {Object} user - User object from DB
     * @param {Buffer} fileBuffer - Buffer of the uploaded file
     * @param {string} fileName - Original filename
     * @returns {Promise<Object>} Verification results
     */
    async verify(user, fileBuffer, fileName) {
        let tempPath = null;
        try {
            Logger.info(`[Ownership] Starting verification for: ${fileName}`);
            
            // 1. Create a temporary file for OCR (OcrService expects a file object with path)
            const tempDir = os.tmpdir();
            tempPath = path.join(tempDir, `verify_${Date.now()}_${fileName}`);
            fs.writeFileSync(tempPath, fileBuffer);

            const mockFile = {
                path: tempPath,
                mimetype: this.getMimeType(fileName)
            };

            // 2. Extract text using OCR
            const rawText = await OcrService.extractText(mockFile);
            
            // 3. Parse extracted text
            const extractedData = TextExtractor.extract(rawText);
            
            // 4. Compare with user data
            const verificationResults = MatchingService.compare(extractedData, user, rawText);

            // Log extracted summary
            const details = verificationResults.matchDetails;
            Logger.info(`[Ownership] Matched Details: Name=${details.nameMatch}, Email=${details.emailMatch}, DOB=${details.dobMatch}`);
            
            Logger.info(`[Ownership] Verification result for ${user.username}: Status: ${verificationResults.verificationStatus}`);
            Logger.info(`[Ownership] Reason: ${verificationResults.reason}`);
            
            const isMatch = verificationResults.verificationStatus === "Verified";

            return {
                isMatch: isMatch,
                score: verificationResults.ownershipPercentage,
                status: verificationResults.verificationStatus,
                extractedData: extractedData,
                reason: verificationResults.reason,
                matchDetails: verificationResults.matchedFields
            };
        } catch (error) {
            Logger.error("[Ownership] Verification process failed:", error.message);
            // Fallback: if OCR fails, we might still want to proceed or block based on policy
            // For now, return a failed match to be safe
            return {
                isMatch: false,
                score: 0,
                status: "Error",
                error: error.message
            };
        } finally {
            // Cleanup temp file if it still exists (OcrService might have deleted it)
            if (tempPath && fs.existsSync(tempPath)) {
                try { fs.unlinkSync(tempPath); } catch (e) {}
            }
        }
    }

    getMimeType(fileName) {
        const ext = path.extname(fileName).toLowerCase();
        if (ext === '.pdf') return 'application/pdf';
        if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
        if (ext === '.png') return 'image/png';
        return 'application/octet-stream';
    }
}

export default new OwnershipService();
