import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';

dotenv.config();

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY;
const VT_BASE_URL = 'https://www.virustotal.com/api/v3';

const vtClient = axios.create({
    baseURL: VT_BASE_URL,
    headers: {
        'x-apikey': VT_API_KEY,
        'accept': 'application/json'
    }
});

class VirusTotalService {
    /**
     * Check if a file has an existing report on VirusTotal by its hash.
     * @param {string} fileHash - SHA256/MD5/SHA1 hash of the file.
     * @returns {Promise<object|null>} Report data or null if not found.
     */
    async checkFileHash(fileHash) {
        try {
            console.log(`Checking VirusTotal for hash: ${fileHash}`);
            const response = await vtClient.get(`/files/${fileHash}`);
            return response.data;
        } catch (error) {
            if (error.response && error.response.status === 404) {
                console.log('No existing report found on VirusTotal.');
                return null;
            }
            console.error('Error checking VirusTotal hash:', error.message);
            throw error;
        }
    }

    /**
     * Upload a file to VirusTotal for scanning.
     * @param {Buffer} fileBuffer - The file content.
     * @param {string} fileName - Original file name.
     * @returns {Promise<string>} Analysis ID.
     */
    async uploadAndScanFile(fileBuffer, fileName) {
        try {
            console.log(`Uploading file to VirusTotal: ${fileName}`);
            const formData = new FormData();
            formData.append('file', fileBuffer, { filename: fileName });

            const response = await vtClient.post('/files', formData, {
                headers: {
                    ...formData.getHeaders()
                }
            });

            return response.data.data.id;
        } catch (error) {
            console.error('Error uploading to VirusTotal:', error.message);
            throw error;
        }
    }

    /**
     * Get analysis report using analysis ID.
     * @param {string} analysisId - The ID returned from upload.
     * @returns {Promise<object>} Analysis details.
     */
    async getAnalysisReport(analysisId) {
        try {
            const response = await vtClient.get(`/analyses/${analysisId}`);
            return response.data;
        } catch (error) {
            console.error('Error getting VT analysis report:', error.message);
            throw error;
        }
    }

    /**
     * Summarize analysis results into a simpler object.
     * @param {object} vtData - Raw data from checkFileHash or getAnalysisReport.
     * @returns {object} Summary result.
     */
    summarizeResults(vtData) {
        const stats = vtData.data.attributes.last_analysis_stats || vtData.data.attributes.stats;
        return {
            malicious: stats.malicious,
            suspicious: stats.suspicious,
            undetected: stats.undetected,
            harmless: stats.harmless,
            providerResults: vtData.data.attributes.last_analysis_results || vtData.data.attributes.results
        };
    }
}

export default new VirusTotalService();
