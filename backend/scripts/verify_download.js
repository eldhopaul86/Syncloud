import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const API_BASE = process.env.BACKEND_URL || 'http://localhost:5000';
const TOKEN = 'YOUR_TEST_TOKEN'; // User needs to provide this or I find one
const FILE_ID = '69c5d332848bdc633efdbfdd';

async function testDownload() {
    try {
        console.log(`Testing download for file ${FILE_ID}...`);
        const response = await axios({
            method: 'get',
            url: `${API_BASE}/api/files/${FILE_ID}/download`,
            headers: { 'Authorization': `Bearer ${TOKEN}` },
            responseType: 'stream'
        });

        console.log('Status:', response.status);
        console.log('Headers:', response.headers);
        console.log('Download successful (stream received)');
    } catch (error) {
        console.error('Download failed:', error.response?.data || error.message);
    }
}

// testDownload();
