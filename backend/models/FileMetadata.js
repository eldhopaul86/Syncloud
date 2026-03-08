import mongoose from "mongoose";

const FileMetadataSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        fileName: { type: String, required: true },
        fileSize: { type: Number, required: true },
        fileType: { type: String, required: true },
        cloud: { type: String, required: true },
        url: { type: String, required: true },
        publicId: { type: String },
        folderPath: { type: String, default: "/" },
        parentFolderId: { type: String },
        version: { type: Number, default: 1 },
        priority: { type: String, default: "normal" },
        reason: { type: String },
        lastModified: { type: Date },
        hash: { type: String },
        encrypted: { type: Boolean, default: false },
        aesKey: { type: String }, // Stored encrypted server-side
        iv: { type: String },
        uploadTimestamp: { type: Date, default: Date.now },
        importanceScore: { type: Number },
        importanceReason: { type: String },
        scanStatus: { type: String, enum: ['pending', 'scanning', 'completed', 'failed'], default: 'pending' },
        scanResult: { type: Object }, // VirusTotal analysis results
    },
    {
        timestamps: true,
        collection: "file_details",
    }
);

export const FileMetadata = mongoose.model("FileMetadata", FileMetadataSchema);
