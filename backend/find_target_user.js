import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from './models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/syncloud';
const TARGET_ID = '6998a6ba91ff14'; // Partial ID from previous status check

async function findUser() {
    try {
        await mongoose.connect(MONGO_URI);
        const users = await User.find({ _id: { $regex: new RegExp(`^${TARGET_ID}`) } });
        console.log(`Found ${users.length} matching users:`);
        users.forEach(u => {
            console.log(`- ID: ${u._id}, Email: ${u.email}, Name: ${u.fullName}`);
        });
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findUser();
