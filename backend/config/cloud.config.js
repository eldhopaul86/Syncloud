export const CLOUD_CONFIG = {
  get platform() { return process.env.CLOUD_PLATFORM || "cloudinary"; },

  cloudinary: {
    get cloudName() { return process.env.CLOUDINARY_CLOUD_NAME; },
    get apiKey() { return process.env.CLOUDINARY_API_KEY; },
    get apiSecret() { return process.env.CLOUDINARY_API_SECRET; },
  },

  mega: {
    get email() { return process.env.MEGA_EMAIL; },
    get password() { return process.env.MEGA_PASSWORD; },
  },

  googleDrive: {
    get clientId() { return process.env.GOOGLE_DRIVE_CLIENT_ID; },
    get clientSecret() { return process.env.GOOGLE_DRIVE_CLIENT_SECRET; },
    get redirectUri() { return process.env.GOOGLE_DRIVE_REDIRECT_URI; },
    get refreshToken() { return process.env.GOOGLE_DRIVE_REFRESH_TOKEN; },
  },

  dropbox: {
    get accessToken() { return process.env.DROPBOX_ACCESS_TOKEN; },
  },
};
