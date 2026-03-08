import CryptoJS from 'crypto-js';

/**
 * Encrypts a string using AES-256-CBC.
 * Returns { encryptedData, key, iv, sha256 }
 */
export const encryptFile = async (base64Data, originalFileName) => {
    try {
        // 1. Generate a random 32-byte key and 16-byte IV
        const key = CryptoJS.lib.WordArray.random(32);
        const iv = CryptoJS.lib.WordArray.random(16);

        // 2. Encrypt the base64 data
        const encrypted = CryptoJS.AES.encrypt(base64Data, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        // 3. Generate SHA-256 hash of original data for integrity check
        const sha256 = generateHash(base64Data);

        return {
            encryptedData: encrypted.toString(), // Base64 ciphertext
            key: key.toString(),               // Hex string
            iv: iv.toString(),                 // Hex string
            sha256: sha256                     // Hex string
        };
    } catch (error) {
        console.error('Encryption failed:', error);
        throw new Error('Failed to encrypt file');
    }
};

/**
 * Generates SHA-256 hash of the actual file content
 */
export const generateHash = (base64Data) => {
    // Parse base64 into WordArray to hash the raw binary content
    const contentWordArray = CryptoJS.enc.Base64.parse(base64Data);
    return CryptoJS.SHA256(contentWordArray).toString();
};

/**
 * Decrypts AES-256-CBC encrypted data
 */
export const decryptFile = (encryptedBase64, keyHex, ivHex) => {
    try {
        const key = CryptoJS.enc.Hex.parse(keyHex);
        const iv = CryptoJS.enc.Hex.parse(ivHex);

        const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
            iv: iv,
            mode: CryptoJS.mode.CBC,
            padding: CryptoJS.pad.Pkcs7
        });

        return decrypted.toString(CryptoJS.enc.Base64);
    } catch (error) {
        console.error('Decryption failed:', error);
        throw new Error('Failed to decrypt file');
    }
};
