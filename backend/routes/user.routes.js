import express from "express";
import { updateUserSettings, getUserSettings } from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/settings", protect, getUserSettings);
router.put("/settings", protect, updateUserSettings);

export default router;
