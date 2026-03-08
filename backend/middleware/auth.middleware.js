import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { Logger } from "../utils/logger.js";

export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Not authorized to access this route" });
        }

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Get user from token
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ error: "User no longer exists" });
        }

        next();
    } catch (err) {
        Logger.error("Auth middleware error", err.message);
        res.status(401).json({ error: "Not authorized" });
    }
};
