import express from "express";
import multer from "multer";
import { uploadToSelectedCloud } from "../controllers/upload.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function validateCloud(req, res, next) {
  const cloud = String(req.body?.cloud || "").toLowerCase().trim();
  if (!cloud) return res.status(400).json({ error: "cloud is required" });
  const allowed = ["dropbox", "cloudinary", "mega", "googledrive"];
  if (!allowed.includes(cloud)) {
    return res.status(400).json({ error: `Invalid cloud. Use one of: ${allowed.join(", ")}` });
  }
  next();
}

router.post("/upload", protect, upload.single("file"), validateCloud, uploadToSelectedCloud);

export default router;
