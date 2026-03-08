import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User.js';

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const count = await User.countDocuments();
        console.log(`\n--- DB Verification ---`);
        console.log(`Total Users in DB: ${count}`);

        const latest = await User.findOne().sort({ createdAt: -1 });
        if (latest) {
            console.log(`Latest User: ${latest.username} (${latest.email})`);
            console.log(`Created At: ${latest.createdAt}`);
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err.message);
    }
}

verify();
