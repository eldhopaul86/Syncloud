import { Dropbox } from "dropbox";
import { APP_CONFIG } from "../config/app.config.js";
import { Logger } from "../utils/logger.js";

/**
 * Dropbox Service using official SDK
 */

/**
 * Validates credentials by calling usersGetCurrentAccount
 * Throws descriptive errors if validation fails
 */
async function validateCredentials(creds) {
  const accessToken = creds?.accessToken;
  if (!accessToken) {
    throw new Error("Missing Dropbox access token. Please configure it in Cloud Setup.");
  }

  try {
    const dbx = new Dropbox({ accessToken });
    const response = await dbx.usersGetCurrentAccount();

    if (!response || !response.result) {
      throw new Error("Invalid response from Dropbox");
    }

    Logger.info(`Dropbox validated for user: ${response.result.name.display_name}`);
    return true;
  } catch (error) {
    let message = "Invalid Dropbox credentials";

    // SDK errors often contain status and error property
    if (error.status === 401) {
      message = "Dropbox Error: Expired or invalid access token";
    } else if (error.status === 403) {
      message = "Dropbox Error: Insufficient permissions (missing scopes)";
    } else if (error.error?.error_summary) {
      message = `Dropbox Error: ${error.error.error_summary}`;
    } else if (error.message) {
      message = error.message;
    }

    Logger.error(message);
    throw new Error(message);
  }
}

/**
 * Creates a shared link for a file and converts it to a direct download link
 */
async function createShareLink(dbx, filePath) {
  try {
    const response = await dbx.sharingCreateSharedLinkWithSettings({
      path: filePath,
      settings: { requested_visibility: "public" },
    });

    const shareUrl = response.result.url;
    return shareUrl
      .replace("www.dropbox.com", "dl.dropboxusercontent.com")
      .replace("?dl=0", "");
  } catch (error) {
    // If link already exists, list and return it
    if (error.status === 409 && error.error?.error?.['.tag'] === 'shared_link_already_exists') {
      const listLinks = await dbx.sharingListSharedLinks({ path: filePath });
      if (listLinks.result.links && listLinks.result.links.length > 0) {
        const shareUrl = listLinks.result.links[0].url;
        return shareUrl
          .replace("www.dropbox.com", "dl.dropboxusercontent.com")
          .replace("?dl=0", "");
      }
    }
    throw error;
  }
}

/**
 * Uploads a file to Dropbox using SDK
 */
async function uploadFile(fileName, fileBuffer, mimetype = "application/octet-stream", creds = null) {
  const accessToken = creds?.accessToken;
  const uploadPath = creds?.uploadPath || "/SynCloud";

  if (!accessToken) throw new Error("Missing Dropbox credentials. Please configure them in Cloud Setup.");

  Logger.info("☁️  Uploading file to Dropbox via SDK...");

  try {
    const dbx = new Dropbox({ accessToken });
    const dropboxFileName = `${Date.now()}_${fileName}`;
    const path = `${uploadPath}/${dropboxFileName}`;

    const uploadResponse = await dbx.filesUpload({
      path,
      contents: fileBuffer,
      mode: "add",
      autorename: true,
    });

    const directUrl = await createShareLink(dbx, uploadResponse.result.path_display);

    return {
      publicId: uploadResponse.result.id,
      url: directUrl,
      size: uploadResponse.result.size,
      mimeType: mimetype,
      provider: "dropbox"
    };
  } catch (error) {
    Logger.error("Dropbox upload failed", error.error || error.message);
    throw error;
  }
}

/**
 * Deletes a file from Dropbox
 */
async function deleteFile(fileId, creds = null) {
  const accessToken = creds?.accessToken;
  if (!accessToken) throw new Error("Missing Dropbox credentials.");

  const dbx = new Dropbox({ accessToken });
  return await dbx.filesDeleteV2({ path: fileId });
}

export default { uploadFile, validateCredentials, deleteFile };
