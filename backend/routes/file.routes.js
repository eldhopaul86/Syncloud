import express from "express";
import { FileMetadata } from "../models/FileMetadata.js";
import { getUserFiles, deleteFileMetadata, getRecentFiles, createFolder, moveFile, getFileStats, renameFile, checkDedupe } from "../controllers/file.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protect, getUserFiles);
router.post("/check-dedupe", protect, checkDedupe);
router.get("/recent", protect, getRecentFiles);
router.get("/stats", protect, getFileStats);
router.post("/folder", protect, createFolder);
router.patch("/move", protect, moveFile);
router.patch("/:id/rename", protect, renameFile);
router.delete("/:id", protect, deleteFileMetadata);

export default router;
