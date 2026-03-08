import express from "express";
import { handleAISearch } from "../controllers/search.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

// All search routes are protected
router.use(protect);

/**
 * @route POST /api/search/ai
 * @desc Handle natural language search using Groq and semantic ranking
 */
router.post("/ai", handleAISearch);

export default router;
