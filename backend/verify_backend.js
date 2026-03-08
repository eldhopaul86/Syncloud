import dotenv from "dotenv";
dotenv.config();

import { encryptJSON, decryptJSON } from "./utils/encryption.service.js";
import { Logger } from "./utils/logger.js";

async function testEncryption() {
    Logger.info("Starting Encryption Test...");
    const testCreds = { apiKey: "test-api-key", apiSecret: "test-secret" };

    try {
        const encrypted = encryptJSON(testCreds);
        Logger.info(`Encrypted: ${encrypted}`);

        const decrypted = decryptJSON(encrypted);
        Logger.info(`Decrypted: ${JSON.stringify(decrypted)}`);

        if (JSON.stringify(testCreds) === JSON.stringify(decrypted)) {
            Logger.success("Encryption/Decryption cycle PASSED");
        } else {
            Logger.error("Encryption/Decryption cycle FAILED (data mismatch)");
        }
    } catch (error) {
        Logger.error("Encryption Test FAILED", error.message);
    }
}

// Run tests
const run = async () => {
    // Check for encryption key
    if (!process.env.CREDENTIAL_ENCRYPTION_KEY) {
        Logger.error("CREDENTIAL_ENCRYPTION_KEY is missing in .env. Integration test will fail.");
    } else {
        await testEncryption();
    }

    process.exit(0);
};

run();
