import Groq from "groq-sdk";
import { Logger } from "../utils/logger.js";
import dotenv from "dotenv";

dotenv.config();

class GroqService {
    constructor() {
        this.groq = null;
        this.apiKey = null;
    }

    getGroqClient() {
        const currentApiKey = process.env.GROQ_API_KEY;
        if (currentApiKey && (!this.groq || this.apiKey !== currentApiKey)) {
            this.apiKey = currentApiKey;
            this.groq = new Groq({ apiKey: this.apiKey });
            Logger.info("Groq client initialized with API key.");
        } else if (!currentApiKey && this.groq) {
            this.groq = null;
            this.apiKey = null;
            Logger.info("GROQ_API_KEY not found in environment variables. Groq search features will use fallback logic.");
        } else if (!currentApiKey && !this.groq) {
            Logger.info("GROQ_API_KEY not found in environment variables. Groq search features will use fallback logic.");
        }
        return this.groq;
    }

    async parseQuery(rawQuery) {
        const groq = this.getGroqClient();
        const prompt = `
      You are an AI assistant that converts natural language file search queries into structured JSON.
      Convert the following user query into a structured JSON format.
      
      Requirements:
      1. Return ONLY a valid JSON object.
      2. No markdown formatting, no extra text.
      3. Use exactly these keys:
         - intent (string: "search", "filter", or "unknown")
         - primary_subject (string: the main one or two words describing WHAT is being searched)
         - semantic_synonyms (array of strings: 3-5 synonyms or closely related concepts)
         - keywords (array of strings: individual relevant words from the query)
         - file_type (string: "pdf", "image", "video", "document", or "any")
         - cloud_source (string: "google_drive", "dropbox", "mega", "cloudinary", or "any")
         - date_filter (string: "today", "yesterday", "last_week", "last_month", or "any")
         - raw_query (the original query string)

      User Query: "${rawQuery}"
    `;

        try {
            if (!groq) throw new Error("GROQ_API_KEY is missing");

            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0.1,
                response_format: { type: "json_object" },
            });

            const responseContent = completion.choices[0]?.message?.content;
            return JSON.parse(responseContent);
        } catch (error) {
            Logger.error("Error parsing query with Groq:", error);
            return {
                intent: "search",
                keywords: rawQuery.split(" ").filter(word => word.length > 2),
                file_type: "any",
                cloud_source: "any",
                date_filter: "any",
                raw_query: rawQuery,
                error: error.message
            };
        }
    }

    async verifyMatches(rawQuery, candidates) {
        if (!candidates || candidates.length === 0) return [];
        const groq = this.getGroqClient();
        if (!groq) return candidates;

        const now = new Date();
        const candidatesContext = candidates.map(c => ({
            id: c._id,
            fileName: c.fileName,
            fileType: c.fileType,
            reason: c.reason,
            importanceReason: c.importanceReason,
            uploadDate: c.uploadTimestamp || c.createdAt,
            cloud: c.cloud
        }));

        const prompt = `
      You are an AI search verifier for "SynCloud". 
      Current Date: ${now.toUTCString()}
      User Search Query: "${rawQuery}"
      
      Candidate Files (Check content AND metadata):
      ${JSON.stringify(candidatesContext, null, 2)}
      
      Requirements:
      1. Determine if a candidate is relevant based on BOTH content (name/reason) AND metadata (type/date/cloud).
      2. CATEGORICAL SEARCH: If the user looks for a category (e.g., "PDFs", "Images", "from last week", "from Google Drive"), ANY file matching that metadata category is RELEVANT, regardless of its semantic topic.
      3. TOPICAL SEARCH: If the user looks for a specific subject (e.g., "Resume", "Assignment", "Sports"), be stricter about the meaning matching the fileName or description.
      4. If NO files are relevant, return an empty array [].
      
      Return Format: A JSON object with a key 'relevant_ids' containing an array of strings.
    `;

        try {
            const completion = await groq.chat.completions.create({
                messages: [{ role: "user", content: prompt }],
                model: "llama-3.3-70b-versatile",
                temperature: 0,
                response_format: { type: "json_object" },
            });

            const content = JSON.parse(completion.choices[0]?.message?.content);
            const relevantIds = content.relevant_ids || [];

            console.log(`[DEBUG] AI Verification: ${relevantIds.length} relevant files found out of ${candidates.length} candidates.`);

            return candidates.filter(c => relevantIds.includes(c._id.toString()));
        } catch (error) {
            Logger.error("Error in AI verification stage:", error);
            return candidates; // Fallback to all candidates on error
        }
    }
}

export default new GroqService();
