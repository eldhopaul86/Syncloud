export const GEMINI_CONFIG = {
  get API_KEY() { return process.env.GEMINI_API_KEY; },
  MODEL: "gemini-flash-latest",
  IMPORTANCE_THRESHOLD: 1,
};

export const FILE_PROMPTS = {
  ".txt": "Return a JSON object ONLY. The JSON should have a 'summary' key and an 'importanceScore' (1-10). Scoring Guidelines: 10 = Identity docs, passwords, legal contracts. 8-9 = Invoices, medical reports, certificates. 5-7 = Important work/study notes, formal letters. 1-4 = Casual text, scratchpads, generic info.",
  ".pdf": "Return a JSON object ONLY. The JSON should have a 'summary' key and an 'importanceScore' (1-10). Scoring Guidelines: 10 = Passports, ID cards, Deeds. 8-9 = Tax forms, Bank statements, Certificates. 5-7 = Technical papers, Manuals, Reports. 1-4 = Flyers, generic brochures, reading material.",
  // ".doc": "...", // Gemini API does not support DOC/DOCX direct upload
  // ".docx": "...",
  ".jpg": "Return a JSON object ONLY. The JSON should have 'description', 'assessment', and 'importanceScore' (1-10). Scoring Guidelines: 10 = Photos of ID cards, Passports, QR codes for keys. 8-9 = Photos of receipts, handwritten notes, certificates. 5-7 = Screenshots of important info, project boards. 1-4 = Personal portraits, landscapes, casual selfies, memes.",
  ".jpeg": "Return a JSON object ONLY. The JSON should have 'description', 'assessment', and 'importanceScore' (1-10). Scoring Guidelines: 10 = Photos of ID cards, Passports, QR codes for keys. 8-9 = Photos of receipts, handwritten notes, certificates. 5-7 = Screenshots of important info, project boards. 1-4 = Personal portraits, landscapes, casual selfies, memes.",
  ".png": "Return a JSON object ONLY. The JSON should have 'description', 'assessment', and 'importanceScore' (1-10). Scoring Guidelines: 10 = Photos of ID cards, Passports, QR codes for keys. 8-9 = Photos of receipts, handwritten notes, certificates. 5-7 = Screenshots of important info, project boards. 1-4 = Personal portraits, landscapes, casual selfies, memes.",
  ".gif": "Return a JSON object ONLY. The JSON should have 'description', 'assessment', and 'importanceScore' (1-10). Scoring Guidelines: 1-2 (usually not important unless it's a recorded screen capture of data).",
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