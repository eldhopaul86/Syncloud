import mongoose from "mongoose";

const VerificationRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["Aadhaar", "PAN", "Passport", "DrivingLicense", "Other"],
      default: "Other",
    },
    extractedData: {
      name: String,
      dob: String,
      phone: String,
      email: String,
      documentId: String,
      gender: String,
      address: String,
    },
    matchResults: {
      nameMatch: Boolean,
      dobMatch: Boolean,
      emailMatch: Boolean,
    },
    mismatchedFields: [String],
    missingFields: [String],
    overallConfidence: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Verified", "Partially Verified", "Not Verified", "Pending"],
      default: "Pending",
    },
    fileUrl: {
      type: String, // Optional URL if uploaded to cloud, or just temporary reference
    },
  },
  { timestamps: true }
);

export const VerificationRecord = mongoose.model(
  "VerificationRecord",
  VerificationRecordSchema
);
