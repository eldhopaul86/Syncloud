/* ================================
   Utility: ArrayBuffer → Base64
================================ */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

/* ================================
   Utility: ArrayBuffer → hex SHA-256
================================ */
async function sha256HexFromArrayBuffer(buffer) {
  const hash = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ================================
   1. Generate AES-256 Key
================================ */
export async function generateAES256Key() {
  return crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/* ================================
   2. Encrypt File (AES-256-GCM)
================================ */
export async function encryptFileAES(file, aesKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const buffer = await file.arrayBuffer();

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    aesKey,
    buffer
  );

  return {
    encryptedData: arrayBufferToBase64(encrypted),
    iv: Array.from(iv),
    // Added: easier to inspect + ship over JSON than number[]
    ivBase64: arrayBufferToBase64(iv.buffer),
  };
}

/* ================================
   3. Hash File (SHA-256)
================================ */
export async function hashFileSHA256(file) {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buffer);

  return [...new Uint8Array(hash)]
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ================================
   4. Extract Text from PDF (PDF.js)
================================ */
async function extractTextFromPDF(file) {
  // Added guard (prevents runtime crash if PDF.js not loaded)
  if (typeof pdfjsLib === "undefined") return "";

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  let text = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    content.items.forEach(item => {
      text += item.str + " ";
    });
  }
  return text.toLowerCase();
}

/* ================================
   5. Dynamic Keyword Extraction
   (No fixed length)
================================ */
function extractKeywordsFromText(text) {
  const stopwords = new Set([
    "the","is","and","of","to","in","for","with","on","this","that",
    "by","an","as","are","was","were","be","from","or","at","it"
  ]);

  const words = text
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));

  const freq = {};
  words.forEach(w => (freq[w] = (freq[w] || 0) + 1));

  const entries = Object.entries(freq);
  if (entries.length === 0) return [];

  // Find max frequency
  const maxFreq = Math.max(...entries.map(e => e[1]));

  // Dynamic threshold (30% of max frequency)
  const threshold = Math.ceil(maxFreq * 0.3);

  return entries
    .filter(([_, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/* ================================
   6. Generate Metadata
================================ */
function generateMetadata(file, hash, keywords) {
  return {
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    lastModified: new Date(file.lastModified).toISOString(),
    hash,
    encrypted: true,
    version: 1,
    priority: "PENDING",
    keywords
  };
}

function inferDebugFromUrl() {
  try {
    if (typeof window === "undefined" || !window?.location?.search) return false;
    const params = new URLSearchParams(window.location.search);
    return params.get("debug") === "1" || params.get("debug") === "true";
  } catch {
    return false;
  }
}

/* ================================
   7. FULL CLIENT PIPELINE
================================ */
export async function processFileForUpload(file, options = {}) {
  const debug = options.debug ?? inferDebugFromUrl();

  let keywords = [];

  // Content-based keyword extraction (PDF only)
  if (file.type === "application/pdf") {
    const text = await extractTextFromPDF(file);
    keywords = extractKeywordsFromText(text);
  }

  // Crypto pipeline
  const aesKey = await generateAES256Key();
  const encrypted = await encryptFileAES(file, aesKey);
  const hash = await hashFileSHA256(file);

  const rawKey = await crypto.subtle.exportKey("raw", aesKey);
  const aesKeyBase64 = arrayBufferToBase64(rawKey);
  const aesKeySha256 = await sha256HexFromArrayBuffer(rawKey);

  const metadata = generateMetadata(file, hash, keywords);

  if (debug) {
    console.groupCollapsed("Client crypto pipeline");
    console.log("metadata:", metadata);
    console.log("sha256(file):", hash);
    console.log("aesKey(base64):", aesKeyBase64);
    console.log("sha256(aesKey):", aesKeySha256);
    console.log("iv(array):", encrypted.iv);
    console.log("iv(base64):", encrypted.ivBase64);
    console.groupEnd();
  }

  return {
    encryptedFile: encrypted.encryptedData,
    iv: encrypted.iv,
    ivBase64: encrypted.ivBase64,
    aesKey: aesKeyBase64,
    aesKeySha256,
    metadata,

    // Added: single place to look for "encrypted file + iv + aesKey"
    cryptoPayload: {
      encryptedFile: encrypted.encryptedData,
      iv: encrypted.iv,
      ivBase64: encrypted.ivBase64,
      aesKey: aesKeyBase64,
      aesKeySha256,
    },
  };
}
