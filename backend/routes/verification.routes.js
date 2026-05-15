import express from "express";
import { verifyOwnership, getVerificationStatus, reVerify } from "../controllers/verification.controller.js";
import { documentUpload } from "../middleware/upload.middleware.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// Route to upload document and trigger verification
router.post(
  "/verify",
  protect,
  documentUpload.single("document"),
  verifyOwnership
);

// Route to re-trigger verification (useful for re-processing with same doc or new doc)
router.post(
  "/re-verify",
  protect,
  documentUpload.single("document"),
  reVerify
);

// Route to check status of a past verification
router.get("/status/:id", protect, getVerificationStatus);

export default router;
