import { OcrService } from "../services/ocr.service.js";
import { TextExtractor } from "../utils/text.extractor.js";
import { MatchingService } from "../services/matching.service.js";
import { VerificationRecord } from "../models/VerificationRecord.js";
import { User } from "../models/User.js";

export const verifyOwnership = async (req, res) => {
  try {
    const file = req.file;
    const userId = req.user?.id;

    if (!file) {
      return res.status(400).json({ success: false, message: "No document uploaded" });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized. User ID missing." });
    }

    // 1. Fetch User from DB
    const dbUser = await User.findById(userId);
    if (!dbUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2. OCR Extraction
    const rawText = await OcrService.extractText(file);
    console.log("--- OCR RAW TEXT ---");
    console.log(rawText);
    console.log("--------------------");

    // 3. Parse Extracted Text
    const extractedData = TextExtractor.extract(rawText);

    // 4. Matching Logic
    const verificationResults = MatchingService.compare(extractedData, dbUser, rawText);

    // 5. Save Record
    const verificationRecord = new VerificationRecord({
      userId: dbUser._id,
      documentType: req.body.documentType || "Other",
      extractedData: extractedData,
      matchResults: verificationResults.matchDetails,
      mismatchedFields: verificationResults.unmatchedFields,
      missingFields: verificationResults.missingFields,
      overallConfidence: verificationResults.ownershipPercentage,
      status: verificationResults.verificationStatus,
    });

    await verificationRecord.save();

    // 6. Return Response
    return res.status(200).json({
      success: true,
      message: "Ownership verification completed",
      verificationResult: {
        status: verificationResults.verificationStatus,
        ownershipPercentage: verificationResults.ownershipPercentage,
        matchedFields: verificationResults.matchedFields,
        unmatchedFields: verificationResults.unmatchedFields,
        missingFields: verificationResults.missingFields,
        extractedAttributes: extractedData,
        normalizedData: verificationResults.normalizedData
      },
      recordId: verificationRecord._id
    });
  } catch (error) {
    console.error("Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error processing verification",
      error: error.message,
    });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const record = await VerificationRecord.findOne({ _id: id, userId: userId });

    if (!record) {
      return res.status(404).json({ success: false, message: "Verification record not found" });
    }

    return res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Fetch Verification Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error fetching verification status",
      error: error.message,
    });
  }
};

export const reVerify = async (req, res) => {
    // Basic wrapper for re-triggering logic if needed
    return verifyOwnership(req, res);
};
