import groqService from "../services/groq.service.js";
import searchService from "../services/search.service.js";
import { Logger } from "../utils/logger.js";

async function testDateFiltering() {
    try {
        const now = new Date();
        const yesterday = new Date(); yesterday.setDate(now.getDate() - 1);
        const lastWeek = new Date(); lastWeek.setDate(now.getDate() - 5);
        const oldFile = new Date(); oldFile.setMonth(now.getMonth() - 2);

        const mockUserFiles = [
            {
                _id: "today_1",
                fileName: "Daily_Report_Today.pdf",
                uploadTimestamp: now,
                fileType: "application/pdf",
                reason: "Report generated today.",
                toObject: function () { return this; }
            },
            {
                _id: "yesterday_1",
                fileName: "Meeting_Notes_Yesterday.docx",
                uploadTimestamp: yesterday,
                fileType: "application/msword",
                reason: "Notes from yesterday's meeting.",
                toObject: function () { return this; }
            },
            {
                _id: "last_week_1",
                fileName: "Project_Proposal.pdf",
                uploadTimestamp: lastWeek,
                fileType: "application/pdf",
                reason: "Proposal from last week.",
                toObject: function () { return this; }
            },
            {
                _id: "old_1",
                fileName: "Old_Backup.zip",
                uploadTimestamp: oldFile,
                fileType: "application/zip",
                reason: "A very old backup file named backup.",
                toObject: function () { return this; }
            }
        ];

        const queries = [
            "show me today's files",
            "what did I backup yesterday?",
            "files from last week",
            "backup from today"
        ];

        for (const query of queries) {
            console.log(`\n--- Testing Query: "${query}" ---`);

            const structuredQuery = await groqService.parseQuery(query);
            console.log("Structured AI Result:", JSON.stringify(structuredQuery, null, 2));

            // Note: In a real scenario, handleAISearch would have already filtered mockUserFiles 
            // using MongoDB. Here we pass all files to searchService to test its scoring/ranking.
            const results = await searchService.search(structuredQuery, mockUserFiles);
            console.log(`[DEBUG] Ranked Results (before AI):`, results.map(r => ({ name: r.fileName, score: r.relevance_score })));
            
            // Further verify with AI (this will use Groq)
            const verified = await groqService.verifyMatches(query, results);

            console.log(`Initial ranked results: ${results.length}`);
            console.log(`Final AI verified results: ${verified.length}`);

            verified.forEach((res, idx) => {
                console.log(`${idx + 1}. ${res.fileName} (Uploaded: ${new Date(res.uploadTimestamp).toLocaleDateString()})`);
            });

            if (query.includes("today") && verified.some(f => !f._id.includes("today"))) {
                console.error("FAIL: Result included non-today files for 'today' query");
            } else if (query.includes("yesterday") && verified.some(f => !f._id.includes("yesterday"))) {
                console.error("FAIL: Result included non-yesterday files for 'yesterday' query");
            } else if (query.includes("last week") && !verified.some(f => f._id.includes("today"))) {
                console.warn("NOTE: 'last week' query did not include 'today' file (checking if this is expected...)");
            } else {
                console.log("PASS: Results appear correctly filtered by date.");
            }
        }

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testDateFiltering();
