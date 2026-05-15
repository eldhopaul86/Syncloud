import tesseract from "tesseract.js";
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import fs from "fs";

export class OcrService {
  /**
   * Process a document and extract text
   * @param {Object} file - The file object from Multer
   * @returns {Promise<string>} - The extracted raw text
   */
  static async extractText(file) {
    if (!file) throw new Error("No file provided for OCR");

    const filePath = file.path;
    const mimeType = file.mimetype;

    try {
      if (mimeType === "application/pdf") {
        return await this.extractFromPdf(filePath);
      } else if (mimeType.startsWith("image/")) {
        return await this.extractFromImage(filePath);
      } else {
        throw new Error("Unsupported file type for OCR");
      }
    } finally {
      // Clean up the temporary file after processing
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }

  static async extractFromImage(filePath) {
    // Basic tesseract extraction (English)
    const { data } = await tesseract.recognize(filePath, "eng", {
      logger: (m) => {}, // Suppress progress logs
    });
    return data.text;
  }

  static async extractFromPdf(filePath) {
    const dataBuffer = fs.readFileSync(filePath);
    
    // The installed version of pdf-parse (v2.4.5) uses a class-based API
    // We need to check if we should use the class or a fallback function
    const PDFParserClass = pdfParse.PDFParse || (typeof pdfParse === 'function' ? null : pdfParse.default);
    
    if (PDFParserClass && typeof PDFParserClass === 'function' && PDFParserClass.prototype && PDFParserClass.prototype.getText) {
      // Class-based API (Mehmet Kozan's version)
      const parser = new PDFParserClass({ data: dataBuffer });
      const result = await parser.getText();
      await parser.destroy();
      return result.text;
    } else {
      // Fallback for classic function-based API (adieuadieu's version)
      const parseFunc = typeof pdfParse === 'function' ? pdfParse : pdfParse.default;
      if (typeof parseFunc !== 'function') {
        throw new Error("Failed to load pdf-parse function or class");
      }
      const data = await parseFunc(dataBuffer);
      return data.text;
    }
  }
}
