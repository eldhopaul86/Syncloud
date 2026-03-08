import { v2 as cloudinary } from "cloudinary";

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

export default { uploadFile, validateCredentials, deleteFile };
