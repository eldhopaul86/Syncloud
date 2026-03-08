import virustotalService from '../services/virustotal.service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function verifyVT() {
    console.log('--- VirusTotal Service Verification ---');

    // 1. Check a known malicious hash (Eicar test file)
    const eicarHash = '275a021bbfb6489e54d471899f7db9d1663fc695ec2fe2a2c4538aabf651fd0f';
    console.log(`\n1. Checking known malicious hash (Eicar): ${eicarHash}`);

    try {
        const report = await virustotalService.checkFileHash(eicarHash);
        if (report) {
            const summary = virustotalService.summarizeResults(report);
            console.log('✅ Success: Report retrieved');
            console.log('Summary:', {
                malicious: summary.malicious,
                suspicious: summary.suspicious,
                undetected: summary.undetected,
                harmless: summary.harmless
            });

            if (summary.malicious > 0) {
                console.log('🚩 THREAT DETECTED correctly.');
            } else {
                console.warn('⚠️ Warning: Known malicious file not flagged? API might be in limited mode.');
            }
        } else {
            console.error('❌ Error: Report not found on VirusTotal.');
        }
    } catch (err) {
        console.error('❌ Error testing hash check:', err.message);
    }

    // 2. Check a known clean hash (Empty file or standard system file)
    const cleanHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'; // Empty file SHA256
    console.log(`\n2. Checking clean hash (Empty file): ${cleanHash}`);

    try {
        const report = await virustotalService.checkFileHash(cleanHash);
        if (report) {
            const summary = virustotalService.summarizeResults(report);
            console.log('✅ Success: Report retrieved');
            console.log('Malicious count:', summary.malicious);
        } else {
            console.log('ℹ️ Clean hash not found in VT database (expected for random clean files).');
        }
    } catch (err) {
        console.error('❌ Error checking clean hash:', err.message);
    }

    console.log('\n--- Verification Finished ---');
}

verifyVT().catch(console.error);
