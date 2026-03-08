import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { CloudCredential } from './models/CloudCredential.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncloud';
const USER_ID = '67eb220c9abc7192e658b7e4';

async function check() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const credentials = await CloudCredential.find({ userId: USER_ID });
        console.log(`Found ${credentials.length} credentials for user ${USER_ID}:`);
        credentials.forEach(c => {
            console.log(`- Cloud: ${c.cloudName}, Validated: ${c.isValidated}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

check();
