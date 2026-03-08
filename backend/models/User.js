import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
    {
        fullName: { type: String, required: true },
        username: { type: String, required: true, unique: true },
        email: { type: String, required: true, unique: true },
        password: { type: String, required: true },
        dateOfBirth: { type: Date, required: false }, // Added date of birth
        isVerified: { type: Boolean, default: false },
        otp: { type: String },
        otpExpires: { type: Date },
        passwordLastChanged: { type: Date, default: Date.now },
        aesEncryptionEnabled: { type: Boolean, default: false },
        defaultCloud: { type: String, enum: ["dropbox", "cloudinary", "mega", "googledrive"], default: "cloudinary" },
    },
    {
        timestamps: true,
        collection: "user_details", // Using the collection name requested by the user
    }
);

export const User = mongoose.model("User", UserSchema);
