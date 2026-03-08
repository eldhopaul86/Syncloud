import express from "express";
import { addCloudCredential, getCloudCredentials, testCloudCredentials } from "../controllers/cloud.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/credentials", protect, addCloudCredential);
router.post("/credentials/test", protect, testCloudCredentials); // NEW
router.get("/credentials", protect, getCloudCredentials);

export default router;
