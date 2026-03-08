import mongoose from "mongoose";

const CloudCredentialSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        cloudName: { type: String, required: true, enum: ["dropbox", "cloudinary", "mega", "googledrive"] },
        credentials: { type: String, required: true }, // Encrypted JSON string
        isValidated: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: "cloud_credential",
    }
);

// Index for faster user-cloud lookup
CloudCredentialSchema.index({ userId: 1, cloudName: 1 }, { unique: true });

export const CloudCredential = mongoose.model("CloudCredential", CloudCredentialSchema);
