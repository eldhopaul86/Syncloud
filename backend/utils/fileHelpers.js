import path from "path";
import { MIME_TYPES } from "../config/gemini.config.js";

export function getFileMimeType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
}

export function getFileExtension(fileName) {
  return path.extname(fileName).toLowerCase();
}