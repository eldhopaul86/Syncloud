import { Storage } from "megajs";

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

export default { uploadFile, validateCredentials, deleteFile };
