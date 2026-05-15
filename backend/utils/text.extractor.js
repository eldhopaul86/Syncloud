// Utility to extract structured data from raw OCR text
export class TextExtractor {
  static extract(rawText) {
    const text = rawText.replace(/\n/g, " ");

    return {
      name: this.extractName(text),
      dob: this.extractDob(text),
      phone: this.extractPhone(text),
      email: this.extractEmail(text),
      documentId: this.extractDocumentId(text),
      gender: this.extractGender(text),
      address: this.extractAddress(text),
      nationality: this.extractNationality(text)
    };
  }

  static extractName(text) {
    // 1. Label-based extraction
    // Expanded labels and improved capture group to handle initials and dots
    const labels = [
      "Name of the Candidate",
      "Candidate Name",
      "Candidate's Name",
      "Full Name",
      "NAME OF THE CANDIDATE",
      "CANDIDATE NAME",
      "NAME",
      "Name"
    ].join("|");

    const nameMatch = text.match(new RegExp(`(?:${labels})[\\s:]*([A-Z][A-Z\\s\\.]{2,40}?(?=\\s{2}|(?:\\b(?:DOB|DATE|GENDER|FATHER|MOTHER|GROUP|EXAM|YOUR SCORE)\\b)|:|\\n|$))`, "i"));
    
    if (nameMatch) {
      let name = nameMatch[1].trim();
      // Clean up if it caught "OF THE CANDIDATE" due to partial label match or OCR noise
      name = name.replace(/^(OF THE CANDIDATE|THE CANDIDATE|OF THE|OF)\s+/i, '');
      if (name.length > 2) return name;
    }

    // 2. Fallback: Upper case sequences with initials (e.g. "SANDEEP M S" or "J. DOE")
    const upperMatch = text.match(/\b([A-Z]{3,}(?:\s+[A-Z]\.?){1,3}(?:\s+[A-Z]{2,})?|[A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})?)\b/);
    if (upperMatch) return upperMatch[1].trim();

    return null;
  }

  static extractDob(text) {
    // Match common date formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, etc.
    // Specifically looking for keywords like DOB, Date of Birth
    const dobLabelMatch = text.match(/(?:DOB|Date of Birth|DATE OF BIRTH|Born)[\s:]*(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})/i);
    if (dobLabelMatch) return dobLabelMatch[1];

    const dobMatch = text.match(/\b(\d{2}[/-]\d{2}[/-]\d{4}|\d{4}[/-]\d{2}[/-]\d{2})\b/);
    return dobMatch ? dobMatch[1] : null;
  }

  static extractPhone(text) {
    const phoneMatch = text.match(/\b(?:\+?91[\s-]?)?[6789]\d{9}\b/);
    if (phoneMatch) {
      return phoneMatch[0].replace(/\D/g, "").slice(-10);
    }
    return null;
  }

  static extractEmail(text) {
    const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return emailMatch ? emailMatch[0] : null;
  }

  static extractDocumentId(text) {
    // Aadhaar: 12 digits
    const aadhaarMatch = text.match(/\b\d{4}\s\d{4}\s\d{4}\b/);
    if (aadhaarMatch) return aadhaarMatch[0].replace(/\s/g, "");

    // PAN: 5 letters, 4 digits, 1 letter
    const panMatch = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
    if (panMatch) return panMatch[0];

    // Passport/DL often have alphanumeric IDs
    const dlMatch = text.match(/\b[A-Z]{2}\d{2}\s?\d{11}\b/); // Indian DL
    if (dlMatch) return dlMatch[0].replace(/\s/g, "");

    return null;
  }

  static extractGender(text) {
    const genderMatch = text.match(/\b(MALE|FEMALE|TRANSGENDER|Male|Female)\b/i);
    return genderMatch ? genderMatch[1].toUpperCase() : null;
  }

  static extractAddress(text) {
    const addressMatch = text.match(/(?:Address|ADDRESS)[\s:]*([A-Za-z0-9\s,.-]{10,100})/i);
    return addressMatch ? addressMatch[1].trim() : null;
  }

  static extractNationality(text) {
    const natMatch = text.match(/(?:Nationality|NATIONALITY)[\s:]*([A-Z][a-z]{3,20})/i);
    return natMatch ? natMatch[1].trim() : null;
  }
}
