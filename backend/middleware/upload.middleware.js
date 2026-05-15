import multer from "multer";
import path from "path";
import fs from "fs";

const tempDir = "temp/";
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Define storage for temporary files during OCR processing
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
    );
  },
});

// Restrict file types
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF, JPEG, and PNG files are allowed."
      ),
      false
    );
  }
};

export const documentUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: fileFilter,
});
