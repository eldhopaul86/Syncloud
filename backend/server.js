// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import uploadRoutes from "./routes/upload.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cloudRoutes from "./routes/cloud.routes.js";
import userRoutes from "./routes/user.routes.js";
import fileRoutes from "./routes/file.routes.js";
import searchRoutes from "./routes/search.routes.js";
import { APP_CONFIG } from "./config/app.config.js";
import { Logger } from "./utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Connect to MongoDB
const dbUri = process.env.MONGODB_URI;
if (!dbUri) {
  Logger.error("CRITICAL: MONGODB_URI is totally missing from env!");
} else if (dbUri.includes("<cluster>") || dbUri.includes("<user>")) {
  Logger.error(`CRITICAL: MONGODB_URI contains placeholders: ${dbUri}`);
  Logger.error("Please check your System Environment Variables and .env file.");
} else {
  const maskedUri = dbUri.replace(/:([^@]+)@/, ":****@");
  Logger.info(`Connecting to DB: ${maskedUri}`);

  mongoose
    .connect(dbUri)
    .then(() => Logger.success("Connected to MongoDB (syncloud)"))
    .catch((err) => Logger.error("MongoDB connection error", err));
}

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.json());

// Set up HBS
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.use("/api/auth", authRoutes);
app.use("/api/cloud", cloudRoutes);
app.use("/api/user", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/search", searchRoutes);
app.use("/api", uploadRoutes);

// Start server
const backendUrl = process.env.BACKEND_URL || `http://localhost:${APP_CONFIG.PORT}`;
app.listen(APP_CONFIG.PORT, () => {
  Logger.success(`Backend running on ${backendUrl}`);
});

export default app;