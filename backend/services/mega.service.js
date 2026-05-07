import { Storage } from "megajs";
import { Logger } from "../utils/logger.js";

/**
 * Validates credentials by attempting a login
 */
async function validateCredentials(creds) {
  const email = creds?.email;
  const password = creds?.password;

  if (!email || !password) return false;

  return new Promise((resolve) => {
    try {
      const storage = new Storage({ email, password });
      let settled = false;

      const finish = (result) => {
        if (settled) return;
        settled = true;
        try {
          if (storage.api && storage.api.active) {
            storage.close?.();
          }
        } catch (e) { }
        resolve(result);
      };

      // Ensure error doesn't crash the process
      storage.on("error", (err) => {
        console.error("Mega Validation Error:", err.message);
        finish(false);
      });
      storage.on("ready", () => finish(true));

      // Failsafe timeout
      setTimeout(() => finish(false), 15000);
    } catch (err) {
      resolve(false);
    }
  });
}

async function uploadFile(originalName, buffer, mimetype = "application/octet-stream", creds = null) {
  const email = creds?.email;
  const password = creds?.password;

  if (!email || !password) throw new Error("Missing MEGA credentials. Please configure them in Cloud Setup.");

  const storage = new Storage({ email, password });

  // Important: handle error immediately to avoid unhandled rejection/crash
  await new Promise((resolve, reject) => {
    storage.on("ready", resolve);
    storage.on("error", (err) => {
      const msg = err.message || "Mega login failed";
      reject(new Error(`Mega Error: ${msg}`));
    });
  });

  try {
    const remote = await new Promise((resolve, reject) => {
      const up = storage.upload({ name: `${Date.now()}_${originalName}` }, buffer);
      up.on("complete", (file) => resolve(file));
      up.on("error", reject);
    });

    const shareUrl = await new Promise((resolve) => {
      remote.link((err, url) => resolve(err ? null : url));
    });

    return {
      publicId: remote?.handle,
      url: shareUrl,
      size: buffer.length,
      mimeType: mimetype,
      provider: "mega"
    };
  } finally {
    try {
      storage.close?.();
    } catch (e) { }
  }
}

/**
 * Deletes a file from MEGA using its handle
 */
async function deleteFile(handle, creds = null) {
  const email = creds?.email;
  const password = creds?.password;
  if (!email || !password) throw new Error("Missing MEGA credentials.");

  const storage = new Storage({ email, password });
  await new Promise((resolve, reject) => {
    storage.on("ready", resolve);
    storage.on("error", reject);
  });

  try {
    const file = storage.find(handle);
    if (file) {
      await file.delete();
      return true;
    }
    return false;
  } finally {
    storage.close?.();
  }
}

/**
 * Fetches the file as a stream for proxying
 */
async function downloadFile(handle, creds, originalUrl) {
  const email = creds?.email;
  const password = creds?.password;

  // Strategy 1: Attempt download from URL if a shared link with key exists
  if (originalUrl && originalUrl.includes('mega.nz/file/') && originalUrl.includes('#')) {
    Logger.info(`🔗 Attempting MEGA download from shared URL: ${handle}`);
    try {
        const { File } = await import('megajs');
        const file = File.fromURL(originalUrl);
        const stream = file.download();
        
        // Return immediately if stream starts successfully
        return { stream };
    } catch (urlErr) {
        Logger.warn(`⚠️ MEGA URL download failed for ${handle}, falling back to storage login: ${urlErr.message}`);
    }
  }

  // Strategy 2: Login and find file by handle
  Logger.info(`📡 Connecting to MEGA for handle: ${handle}`);
  const storage = new Storage({ email, password });
  try {
    await new Promise((resolve, reject) => {
      storage.on("ready", resolve);
      storage.on("error", (err) => {
        Logger.error(`❌ MEGA Login Failed for ${email}`, err.message);
        reject(new Error(`Mega Login Failed: ${err.message}`));
      });
    });

    Logger.info(`🔍 Searching for handle: ${handle} in MEGA`);
    const file = storage.find(handle);
    if (!file) {
        Logger.error(`❌ File not found in MEGA: ${handle}`);
        throw new Error("File not found on MEGA");
    }

    Logger.info(`✅ Found file: ${file.name}. Starting download stream...`);
    const stream = file.download();
    
    // Auto-close storage when stream ends or errors
    stream.on('end', () => {
        Logger.info(`✅ MEGA stream ended for ${handle}`);
        storage.close?.();
    });
    stream.on('error', (err) => {
        Logger.error(`❌ MEGA stream error for ${handle}`, err.message);
        storage.close?.();
    });

    return { stream };
  } catch (err) {
    try { storage.close?.(); } catch (e) { }
    Logger.error(`❌ MEGA download process failed for ${handle}`, err.message);
    throw new Error(`MEGA download failed: ${err.message}`);
  }
}

export default { uploadFile, validateCredentials, deleteFile, downloadFile };
