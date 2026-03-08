import { FileMetadata } from "./models/FileMetadata.js";
import { User } from "./models/User.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ username: "jiji" });
        if (!user) throw new Error("User jiji not found");

        const userId = new mongoose.Types.ObjectId(user._id);
        const defaultCloud = (user.defaultCloud || 'cloudinary').toLowerCase();

        const cloudUsageAggregation = await FileMetadata.aggregate([
            { $match: { userId, cloud: defaultCloud, fileType: { $ne: 'folder' } } },
            { $group: { _id: null, totalSize: { $sum: "$fileSize" } } }
        ]);

        const totalUsed = cloudUsageAggregation.length > 0 ? cloudUsageAggregation[0].totalSize : 0;
        console.log(`VERIFICATION RESULT: User ${user.username} has ${totalUsed} bytes used on ${defaultCloud}`);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

verify();
Riverside
