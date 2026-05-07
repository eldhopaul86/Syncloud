import { v2 as cloudinary } from "cloudinary";
import axios from "axios";
import { Logger } from "../utils/logger.js";

/**
 * Configure cloudinary with either provided credentials or environment fallbacks
 */
function configure(creds) {
  const cloudName = creds?.cloudName;
  const apiKey = creds?.apiKey;
  const apiSecret = creds?.apiSecret;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("Missing Cloudinary credentials. Please configure them in Cloud Setup.");
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  });
}

/**
 * Validates credentials by performing a ping test
 */
async function validateCredentials(creds) {
  try {
    configure(creds);
    const result = await cloudinary.api.ping();
    return result.status === "ok";
  } catch (error) {
    return false;
  }
}

/**
 * Uploads a file to Cloudinary
 */
async function uploadFile(originalName, buffer, mimetype = "application/octet-stream", creds = null) {
  configure(creds);

  const isImage = typeof mimetype === "string" && mimetype.startsWith("image/");
  const resourceType = isImage ? "image" : "raw";

  return await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "syncloud",
        public_id: `${Date.now()}_${originalName}`.replace(/[^\w.\-]+/g, "_"),
        overwrite: false,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          size: result.bytes,
          mimeType: mimetype,
          provider: "cloudinary"
        });
      }
    );

    stream.end(buffer);
  });
}

/**
 * Deletes a file from Cloudinary
 */
async function deleteFile(publicId, creds = null) {
  configure(creds);
  return await cloudinary.uploader.destroy(publicId);
}

/**
 * Fetches the file as a stream for proxying
 */
async function downloadFile(publicId, creds, originalUrl) {
  try {
    configure(creds);
    
    // For authenticated/private assets, we can generate a signed URL
    // or just try to fetch it if we have the credentials.
    // Cloudinary's private_download_url is one way, but for the proxy 
    // we just need A way to get the data.
    
    let downloadUrl = originalUrl;
    
    // If it's a raw file and potentially private, we might need to sign it.
    // But since we are server-side, we can also use the authenticated API if needed.
    // For now, let's try to see if signing the URL helps if it was returning 401.
    
    Logger.info(`📡 Requesting Cloudinary file: ${publicId}`);
    
    const response = await axios({
      method: 'get',
      url: downloadUrl,
      responseType: 'stream'
    });
    
    return { stream: response.data };
  } catch (error) {
    Logger.error(`❌ Cloudinary download failed for ${publicId}`, error.message);
    
    // If we got a 401, maybe we should have used a signed URL
    if (error.response?.status === 401 || error.response?.status === 403) {
      Logger.warn(`⚠️ Cloudinary returned ${error.response.status}. Attempting signed URL fallback...`);
      try {
        // Extract format from originalUrl or default to 'pdf'
        const format = originalUrl.split('.').pop()?.split('?')[0] || 'pdf';
        
        const signedUrl = cloudinary.utils.private_download_url(publicId, format, {
          resource_type: 'raw',
          type: 'upload',
          expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour
        });
        
        Logger.info(`📡 Requesting signed URL for ${publicId} (format: ${format})`);
        
        const retryRes = await axios({
          method: 'get',
          url: signedUrl,
          responseType: 'stream'
        });
        return { stream: retryRes.data };
      } catch (retryErr) {
        Logger.error(`❌ Signed URL fallback also failed`, retryErr.message);
      }
    }
    
    throw new Error(`Cloudinary download failed: ${error.message}`);
  }
}

export default { uploadFile, validateCredentials, deleteFile, downloadFile };
