import { FileMetadata } from "./models/FileMetadata.js";
import { User } from "./models/User.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function debug() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        const users = await User.find({});
        console.log("\n--- Users ---");
        users.forEach(u => {
            console.log(`User: ${u.username}, ID: ${u._id}, DefaultCloud: ${u.defaultCloud}`);
        });

        const files = await FileMetadata.find({});
        console.log("\n--- Files (Metadata) ---");
        files.forEach(f => {
            console.log(`File: ${f.fileName}, Cloud: ${f.cloud}, Size: ${f.fileSize}, UserID: ${f.userId}, Type: ${f.fileType}`);
        });

        console.log("\n--- Verification ---");
        for (const u of users) {
            const defaultCloud = u.defaultCloud || 'cloudinary';
            const cloudUsage = await FileMetadata.aggregate([
                { $match: { userId: u._id, cloud: defaultCloud, fileType: { $ne: 'folder' } } },
                { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
            ]);
            console.log(`User ${u.username} (${u.defaultCloud}) used on ${defaultCloud}: ${cloudUsage[0]?.totalSize || 0} bytes`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debug();
