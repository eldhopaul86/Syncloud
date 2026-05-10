import mongoose from "mongoose";

const AnalysisCacheSchema = new mongoose.Schema(
  {
    hash: { type: String, required: true, index: true },
    score: { type: Number, required: true },
    reason: { type: String, required: true },
    fileName: { type: String }, // For debugging/reference
    modelUsed: { type: String },
    analyzedAt: { type: Date, default: Date.now }
  },
  {
    timestamps: true,
    collection: "analysis_cache",
  }
);

// Optional: Expire cache after 30 days to allow for re-evaluating with newer models/prompts
AnalysisCacheSchema.index({ analyzedAt: 1 }, { expireAfterSeconds: 2592000 });

export const AnalysisCache = mongoose.model("AnalysisCache", AnalysisCacheSchema);
