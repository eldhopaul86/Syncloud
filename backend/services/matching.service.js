import stringSimilarity from "string-similarity";
import { parse, format, isValid } from "date-fns";

export class MatchingService {
  /**
   * Compare extracted OCR data with the User's DB record
   * @param {Object} extractedData - Data from OCR
   * @param {Object} dbUser - User record from MongoDB
   * @returns {Object} Match results and confidence score
   */
  static compare(extractedData, dbUser, rawText = "") {
    const textForSearch = (rawText || "").toLowerCase().replace(/\s+/g, " ");
    
    const results = {
      verificationStatus: "Not Verified",
      ownershipPercentage: 0,
      matchedFields: [],
      unmatchedFields: [],
      missingFields: [],
      reason: "",
      matchDetails: {
        nameMatch: false,
        dobMatch: false,
        emailMatch: false,
      }
    };

    const db = {
      name: dbUser.fullName ? dbUser.fullName.toLowerCase().trim() : null,
      email: dbUser.email ? dbUser.email.toLowerCase().trim() : null,
      dob: dbUser.dateOfBirth ? format(new Date(dbUser.dateOfBirth), "yyyy-MM-dd") : null
    };

    // 1. Name Match (Fuzzy & Everywhere)
    if (db.name) {
      const reversedName = db.name.split(" ").reverse().join(" ");
      const collapsedDbName = db.name.replace(/[\s\.]/g, "");
      const collapsedText = textForSearch.replace(/[\s\.]/g, "");

      const isExactMatch = textForSearch.includes(db.name) || textForSearch.includes(reversedName);
      const isCollapsedMatch = collapsedText.includes(collapsedDbName);
      
      // Fuzzy check against lines (to handle minor spelling mistakes)
      const lines = rawText.split(/\n+/);
      const isFuzzyMatch = lines.some(line => {
        const cleanLine = line.toLowerCase().trim();
        return cleanLine.length > 3 && stringSimilarity.compareTwoStrings(cleanLine, db.name) > 0.8;
      });

      if (isExactMatch || isCollapsedMatch || isFuzzyMatch) {
        results.matchDetails.nameMatch = true;
        results.matchedFields.push("full name");
      }
    }

    // 2. Email Match (Fuzzy & Everywhere)
    if (db.email) {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const foundEmails = rawText.match(emailRegex) || [];
      
      const isEmailMatch = foundEmails.some(email => {
        const cleanEmail = email.toLowerCase().trim();
        // Exact match or very high similarity (to catch gmaii.com etc)
        return cleanEmail === db.email || stringSimilarity.compareTwoStrings(cleanEmail, db.email) > 0.85;
      });

      if (isEmailMatch || textForSearch.includes(db.email)) {
        results.matchDetails.emailMatch = true;
        results.matchedFields.push("email");
      }
    }

    // 3. DOB Match (Multiple Formats)
    if (dbUser.dateOfBirth) {
      const dbDate = new Date(dbUser.dateOfBirth);
      if (!isNaN(dbDate.getTime())) {
        const possibleFormats = [
          format(dbDate, "dd-MM-yyyy"),
          format(dbDate, "yyyy-MM-dd"),
          format(dbDate, "dd/MM/yyyy"),
          format(dbDate, "dd MMM yyyy"),
          format(dbDate, "MMMM d, yyyy"),
          format(dbDate, "d MMMM yyyy"),
          format(dbDate, "dd.MM.yyyy")
        ];

        const isDobMatch = possibleFormats.some(fmt => textForSearch.includes(fmt.toLowerCase()));
        
        if (isDobMatch) {
          results.matchDetails.dobMatch = true;
          results.matchedFields.push("date of birth");
        }
      }
    }

    // Scoring & Status
    const matches = results.matchedFields.length;
    results.ownershipPercentage = Math.round((matches / 3) * 100);

    if (matches > 0) {
      results.verificationStatus = "Verified";
      results.reason = `Matched: ${results.matchedFields.join(", ")}. Document ownership confirmed.`;
    } else {
      results.verificationStatus = "Not Verified";
      results.reason = "None of your identifying details (Name, Email, or DOB) were found in this document.";
    }

    return results;
  }

  /**
   * Helper to normalize dates (used in other parts of the app)
   */
  static normalizeDate(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    return isNaN(date.getTime()) ? null : format(date, "yyyy-MM-dd");
  }
}
