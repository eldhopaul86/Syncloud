import { FileMetadata } from "../models/FileMetadata.js";
import groqService from "../services/groq.service.js";
import searchService from "../services/search.service.js";
import { Logger } from "../utils/logger.js";

/**
 * Handle AI-powered natural language search
 */
export async function handleAISearch(req, res) {
    try {
        const { query, cloud = "any" } = req.body;
        const userId = req.user.id;

        if (!query) {
            return res.status(400).json({ error: "Search query is required" });
        }

        console.log(`\n[AI SEARCH INPUT] User Prompt: "${query}"`);

        // 1. Parse query using Groq (extract keywords and synonyms)
        const structuredQuery = await groqService.parseQuery(query);
        console.log(`[DEBUG] Structured Query:`, JSON.stringify(structuredQuery, null, 2));

        const keywords = structuredQuery.keywords || [];
        const synonyms = structuredQuery.semantic_synonyms || [];
        const fileTypeTerm = (structuredQuery.file_type && structuredQuery.file_type !== "any") ? [structuredQuery.file_type] : [];

        // 2. STEP 1: Strict MongoDB Regex Filtering
        // Combine keywords, synonyms, and categories into a regex pattern
        const searchTerms = [...new Set([...keywords, ...synonyms, ...fileTypeTerm])].filter(t => t.length >= 2);
        console.log(`[DEBUG] Stage 1 Search Terms:`, searchTerms);

        if (searchTerms.length === 0) {
            console.log(`[AI SEARCH OUTPUT] No valid search terms extracted. Results: 0 files.`);
            return res.json({ success: true, files: [], message: "No relevant files found" });
        }

        const regexPattern = new RegExp(searchTerms.join("|"), "i");
        console.log(`[DEBUG] Stage 1 Regex: ${regexPattern}`);

        // Search across ALL text fields in MongoDB
        const filteredFiles = await FileMetadata.find({
            userId,
            $or: [
                { fileName: { $regex: regexPattern } },
                { importanceReason: { $regex: regexPattern } },
                { fileType: { $regex: regexPattern } },
                { reason: { $regex: regexPattern } },
                { priority: { $regex: regexPattern } },
                { folderPath: { $regex: regexPattern } }
            ]
        });

        console.log(`[DEBUG] Database candidates found: ${filteredFiles.length}`);

        // STEP 2: Return early if no files match keywords
        if (filteredFiles.length === 0) {
            console.log(`[AI SEARCH OUTPUT] No files matched keywords in DB. Results: 0 files.`);
            return res.json({
                success: true,
                files: [],
                message: "No relevant files found"
            });
        }

        // 3. STEP 3 & 4: Scoring and Ranking in SearchService
        const rankedResults = await searchService.search(structuredQuery, filteredFiles, cloud);

        // STEP 6 (NEW): AI Verification Stage (RAG Verification)
        // If we have candidates, let the AI review them one last time to be sure.
        const searchResults = await groqService.verifyMatches(query, rankedResults);

        console.log(`[AI SEARCH OUTPUT] Final verified results: ${searchResults.length} files found.`);
        if (searchResults.length > 0) {
            console.log(`[DEBUG] Top Verified Result: "${searchResults[0].fileName}" (Score: ${searchResults[0].relevance_score})`);
        }

        return res.json({
            success: true,
            query: query,
            files: searchResults,
            message: searchResults.length > 0 ? "Results found" : "No relevant files found"
        });

    } catch (error) {
        Logger.error("AI Search Controller Error:", error);
        return res.status(500).json({
            error: "AI search failed",
            message: error.message
        });
    }
}
