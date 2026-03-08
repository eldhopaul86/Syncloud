import groqService from "../services/groq.service.js";
import searchService from "../services/search.service.js";
import { Logger } from "../utils/logger.js";

async function testAISearch() {
    try {
        const mockUserFiles = [
            {
                _id: "1",
                fileName: "Tax_Report_2023.pdf",
                cloud: "google_drive",
                uploadTimestamp: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
                fileType: "application/pdf",
                importanceScore: 85,
                priority: "high",
                reason: "Contains sensitive financial information and tax filings for 2023.",
                toObject: function () { return this; }
            },
            {
                _id: "2",
                fileName: "Family_Vacation.jpg",
                cloud: "cloudinary",
                uploadTimestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
                fileType: "image/jpeg",
                importanceScore: 40,
                priority: "normal",
                reason: "Personal photo from the summer beach vacation with family.",
                toObject: function () { return this; }
            },
            {
                _id: "3",
                fileName: "Resume_Final.pdf",
                cloud: "google_drive",
                uploadTimestamp: new Date(),
                fileType: "application/pdf",
                importanceScore: 90,
                priority: "high",
                reason: "Professional resume for job applications, highly important career document.",
                toObject: function () { return this; }
            }
        ];

        const queries = [
            "find my tax papers",
            "show me vacation photos",
            "important career documents from today"
        ];

        for (const query of queries) {
            console.log(`\n--- Testing Query: "${query}" ---`);

            const structuredQuery = await groqService.parseQuery(query);
            console.log("Structured AI Result:", JSON.stringify(structuredQuery, null, 2));

            const results = await searchService.search(structuredQuery, mockUserFiles);
            console.log(`Found ${results.length} ranked results.`);

            results.forEach((res, idx) => {
                console.log(`${idx + 1}. ${res.fileName} (Score: ${res.relevance_score}) - Reason: ${res.reason}`);
            });
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testAISearch();
