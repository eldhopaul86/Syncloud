export const GEMINI_CONFIG = {
  get API_KEY() { return process.env.GEMINI_API_KEY; },
  MODEL: "gemini-2.5-flash",
  IMPORTANCE_THRESHOLD: 1,
};

export const FILE_PROMPTS = {
  ".txt": "Return a JSON object ONLY. Do NOT include any other text. The JSON should have a 'summary' key with a summary of this text document and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".pdf": "Return a JSON object ONLY. Do NOT include any other text. The JSON should have a 'summary' key with a summary of this PDF document and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  // ".doc": "...", // Gemini API does not support DOC/DOCX direct upload
  // ".docx": "...",
  ".jpg": "Return a JSON object ONLY. Do NOT include any other text. The JSON object should have a 'description' key with a description of this image, an 'assessment' key with assessment of the images relevance, and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".jpeg": "Return a JSON object ONLY. Do NOT include any other text. The JSON object should have a 'description' key with a description of this image, an 'assessment' key with assessment of the images relevance, and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".png": "Return a JSON object ONLY. Do NOT include any other text. The JSON object should have a 'description' key with a description of this image, an 'assessment' key with assessment of the images relevance, and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".gif": "Return a JSON object ONLY. Do NOT include any other text. The JSON object should have a 'description' key with a description of this image, an 'assessment' key with assessment of the images relevance, and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".xlsx": "Return a JSON object ONLY. Do NOT include any other text. The JSON should have a 'summary' key with a summary of this spreadsheet and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
  ".pptx": "Return a JSON object ONLY. Do NOT include any other text. The JSON should have a 'summary' key with a summary of this presentation and an 'importanceScore' key with a score from 1 to 10 (more importance to identity documents, invoices, certificates, letters etc).",
};

export const MIME_TYPES = {
  ".pdf": "application/pdf",
  // ".doc": "application/msword", 
  // ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};