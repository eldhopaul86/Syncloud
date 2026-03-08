import dropboxService from "./dropbox.service.js";
import cloudinaryService from "./cloudinary.service.js";
import megaService from "./mega.service.js";
import googleDriveService from "./googledrive.service.js";

/**
 * Factory to retrieve the correct cloud storage service handler
 */
class CloudStorageFactory {
  getService(provider) {
    const platform = String(provider || "").toLowerCase().trim();

    switch (platform) {
      case "cloudinary":
        return cloudinaryService;
      case "mega":
        return megaService;
      case "googledrive":
      case "google-drive":
        return googleDriveService;
      case "dropbox":
        return dropboxService;
      default:
        // Default fallback
        return dropboxService;
    }
  }
}

export default new CloudStorageFactory();
