import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CloudCredential } from './models/CloudCredential.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncloud';

async function checkAllCreds() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const credentials = await CloudCredential.find({});
        console.log(`Found ${credentials.length} total credentials:`);
        credentials.forEach(c => {
            console.log(`- User: ${c.userId}, Cloud: ${c.cloudName}, Validated: ${c.isValidated}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAllCreds();
