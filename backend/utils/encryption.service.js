import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

/**
 * Encrypts sensitive text (e.g., cloud API keys) using a server-side key.
 * Requires CREDENTIAL_ENCRYPTION_KEY (32 chars) in environment.
 */
export function encrypt(text) {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
        throw new Error("CRITICAL: CREDENTIAL_ENCRYPTION_KEY must be exactly 32 characters.");
    }

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv);

    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);

    return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts sensitive text using the server-side key.
 */
export function decrypt(text) {
    const key = process.env.CREDENTIAL_ENCRYPTION_KEY;
    if (!key || key.length !== 32) {
        throw new Error("CRITICAL: CREDENTIAL_ENCRYPTION_KEY must be exactly 32 characters.");
    }

    const textParts = text.split(":");
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
}

/**
 * Encrypts a JSON object into a string for storage.
 */
export function encryptJSON(obj) {
    return encrypt(JSON.stringify(obj));
}

/**
 * Decrypts a string back into a JSON object.
 */
export function decryptJSON(text) {
    return JSON.parse(decrypt(text));
}
