import crypto from "crypto";

/**
 * Generates a SHA-256 hash from a binary buffer.
 * @param {Buffer} buffer - The file buffer to hash.
 * @returns {string} - The hex-encoded SHA-256 hash.
 */
export function generateSHA256(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
}
