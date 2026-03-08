import { Logger } from "../utils/logger.js";

class SearchService {
    /**
     * Search and rank files based on a structured AI query.
     * @param {Object} structuredQuery - The output from GroqService.parseQuery.
     * @param {Array} filteredFiles - List of files fetched from MongoDB after regex filtering.
     * @param {string} selectedCloud - Optional explicit cloud filter from UI.
     * @returns {Array} Sorted and ranked search results.
     */
    async search(structuredQuery, filteredFiles, selectedCloud = "any") {
        const rawKeywords = structuredQuery.keywords || [];
        const synonyms = structuredQuery.semantic_synonyms || [];
        const targetFileType = (structuredQuery.file_type || "any").toLowerCase();
        const targetDateFilter = (structuredQuery.date_filter || "any").toLowerCase();
        const targetCloud = (selectedCloud !== "any" ? selectedCloud : (structuredQuery.cloud_source || "any")).toLowerCase();

        // 1. Apply Scoring
        let scoredResults = filteredFiles.map(file => {
            let score = 0;
            const fileName = (file.fileName || "").toLowerCase();
            const importanceReason = (file.importanceReason || "").toLowerCase();
            const reason = (file.reason || "").toLowerCase();
            const mimeType = (file.fileType || "").toLowerCase();
            const fileCloud = (file.cloud || "").toLowerCase();
            const uploadDate = new Date(file.uploadTimestamp || file.createdAt);
            const now = new Date();

            const combinedMetadata = (fileName + " " + importanceReason + " " + reason).toLowerCase();

            // Keyword Scoring (High weight)
            rawKeywords.forEach(kw => {
                const kwLower = kw.toLowerCase();
                if (kwLower.length < 2) return;

                const isShort = kwLower.length <= 3;

                // Filename match
                if (isShort ?
                    (fileName === kwLower || fileName.startsWith(kwLower + " ") || fileName.includes(" " + kwLower + ".")) :
                    fileName.includes(kwLower)) {
                    score += 3;
                }

                // Metadata match
                if (isShort ?
                    (combinedMetadata.includes(" " + kwLower + " ") || combinedMetadata.startsWith(kwLower + " ")) :
                    combinedMetadata.includes(kwLower)) {
                    score += 2;
                }
            });

            // Synonym / Semantic Scoring (Boosted weight for better "meaning" matching)
            synonyms.forEach(syn => {
                const synLower = syn.toLowerCase();
                if (synLower.length < 2) return;

                // If a synonym matches, it's a strong indicator of semantic relevance
                if (combinedMetadata.includes(synLower)) {
                    score += 2; // Increased from 1 to 2 to ensure synonyms can help pass the threshold
                }
            });

            // METADATA SCORING (Major boost for categorization)

            // File Type Match
            if (targetFileType !== "any") {
                const isTypeMatch = (targetFileType === "pdf" && mimeType.includes("pdf")) ||
                    (targetFileType === "image" && mimeType.includes("image")) ||
                    (targetFileType === "video" && (mimeType.includes("video") || mimeType.includes("mp4"))) ||
                    (targetFileType === "document" && (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.includes("text") || mimeType.includes("presentation") || mimeType.includes("pptx")));
                if (isTypeMatch) score += 5;
            }

            // Cloud Source Match
            if (targetCloud !== "any" && fileCloud === targetCloud) {
                score += 2;
            }

            // Date Filter Match
            if (targetDateFilter !== "any") {
                let dateMatch = false;
                const uploadRaw = uploadDate.getTime();
                const nowRaw = now.getTime();
                const oneDay = 24 * 60 * 60 * 1000;

                if (targetDateFilter === "today" && uploadDate.toDateString() === now.toDateString()) {
                    dateMatch = true;
                } else if (targetDateFilter === "yesterday") {
                    const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
                    if (uploadDate.toDateString() === yesterday.toDateString()) dateMatch = true;
                } else if (targetDateFilter === "last_week") {
                    if (nowRaw - uploadRaw <= 7 * oneDay) dateMatch = true;
                } else if (targetDateFilter === "last_month") {
                    if (nowRaw - uploadRaw <= 30 * oneDay) dateMatch = true;
                }

                if (dateMatch) score += 4;
            }

            return {
                ...file.toObject(),
                relevance_score: score
            };
        });

        // 2. Sort by score descending
        scoredResults.sort((a, b) => b.relevance_score - a.relevance_score);

        // 3. Apply Relevance Threshold (Relaxed if it's a direct keyword match)
        return scoredResults.filter(file => file.relevance_score >= 2);
    }
}

export default new SearchService();
