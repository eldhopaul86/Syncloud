import dotenv from "dotenv";
dotenv.config();

// Native fetch is available in Node 18+ (User has v22)
async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error("No API KEY found");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

    try {
        console.log(`Fetching models from: ${url.replace(key, "HIDDEN_KEY")}`);
        const response = await fetch(url);

        if (!response.ok) {
            console.error(`Error ${response.status}: ${await response.text()}`);
            return;
        }

        const data = await response.json();
        console.log("Available Models:");
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`); // usually "models/gemini-pro"
                }
            });
        } else {
            console.log("No models returned in list.");
            console.log(JSON.stringify(data, null, 2));
        }

    } catch (error) {
        console.error("Request failed:", error);
    }
}

listModels();
