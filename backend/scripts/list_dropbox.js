import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { FileMetadata } from '../models/FileMetadata.js';

dotenv.config();

async function listDropbox() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const userId = '699ac6a44656e6fad24257e9';
        const file = await FileMetadata.findOne({ userId, cloud: 'dropbox' });
        if (file) {
            console.log('DROPBOX_FILE_DATA_START');
            console.log(JSON.stringify(file, null, 2));
            console.log('DROPBOX_FILE_DATA_END');
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
listDropbox();
