import { google } from "googleapis";
import { CLOUD_CONFIG } from "../config/cloud.config.js";
import { Readable } from "stream";

/**
 * Configure Google Drive with either provided credentials or environment fallbacks
 */
function getDriveInstance(creds) {
  const clientId = creds?.clientId;
  const clientSecret = creds?.clientSecret;
  const refreshToken = creds?.refreshToken;
  const redirectUri = creds?.redirectUri;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Google Drive credentials. Please configure them in Cloud Setup.");
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Validates credentials by performing an 'about.get' test
 */
async function validateCredentials(creds) {
  try {
    const drive = getDriveInstance(creds);
    const response = await drive.about.get({ fields: "user" });
    return !!response.data.user;
  } catch (error) {
    return false;
  }
}

/**
 * Uploads a file to Google Drive
 */
async function uploadFile(originalName, buffer, mimetype = "application/octet-stream", creds = null) {
  const drive = getDriveInstance(creds);

  const fileMetadata = {
    name: `${Date.now()}_${originalName}`,
  };

  const media = {
    mimeType: mimetype,
    body: Readable.from(buffer),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id, name, size, webViewLink",
  });

  return {
    publicId: response.data.id,
    url: response.data.webViewLink,
    size: parseInt(response.data.size) || buffer.length,
    mimeType: mimetype,
    provider: "googledrive"
  };
}

/**
 * Deletes a file from Google Drive
 */
async function deleteFile(fileId, creds = null) {
  const drive = getDriveInstance(creds);
  return await drive.files.delete({ fileId });
}

export default { uploadFile, validateCredentials, deleteFile };
