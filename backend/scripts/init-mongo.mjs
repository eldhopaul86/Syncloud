import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DBNAME || "syncloud";

if (!uri) {
	console.error("Missing MONGODB_URI in backend/.env");
	process.exit(1);
}

const client = new MongoClient(uri, { ignoreUndefined: true });

async function ensureCollection(db, name, options) {
	const exists = await db.listCollections({ name }).toArray();
	if (!exists.length) {
		await db.createCollection(name, options);
	} else if (options?.validator) {
		// best-effort: update validation rules
		try {
			await db.command({
				collMod: name,
				validator: options.validator,
				validationLevel: options.validationLevel ?? "moderate",
			});
		} catch {
			// ignore if not permitted
		}
	}
}

await client.connect();
const db = client.db(dbName);

// user_details
await ensureCollection(db, "user_details", {
	validator: {
		$jsonSchema: {
			bsonType: "object",
			required: ["email", "passwordHash", "createdAt", "updatedAt"],
			properties: {
				email: { bsonType: "string" },
				username: { bsonType: ["string", "null"] },
				passwordHash: { bsonType: "string" },
				createdAt: { bsonType: "date" },
				updatedAt: { bsonType: "date" },
				lastLoginAt: { bsonType: ["date", "null"] },
				meta: { bsonType: ["object", "null"] },
			},
			additionalProperties: true,
		},
	},
	validationLevel: "moderate",
});
await db.collection("user_details").createIndex({ email: 1 }, { unique: true });

// cloud_credentials
await ensureCollection(db, "cloud_credentials", {
	validator: {
		$jsonSchema: {
			bsonType: "object",
			required: ["userId", "provider", "encryptedPayload", "createdAt", "updatedAt"],
			properties: {
				userId: { bsonType: "objectId" },
				provider: { bsonType: "string" },
				label: { bsonType: ["string", "null"] },
				encryptedPayload: { bsonType: ["binData", "string"] },
				keyId: { bsonType: ["string", "null"] },
				createdAt: { bsonType: "date" },
				updatedAt: { bsonType: "date" },
			},
			additionalProperties: true,
		},
	},
	validationLevel: "moderate",
});
await db.collection("cloud_credentials").createIndex(
	{ userId: 1, provider: 1, label: 1 },
	{ unique: true, partialFilterExpression: { label: { $type: "string" } } }
);
await db.collection("cloud_credentials").createIndex(
	{ userId: 1, provider: 1 },
	{ unique: true, partialFilterExpression: { label: { $exists: false } } }
);

// file_metadata
await ensureCollection(db, "file_metadata", {
	validator: {
		$jsonSchema: {
			bsonType: "object",
			required: ["userId", "path", "uploadedAt", "updatedAt"],
			properties: {
				userId: { bsonType: "objectId" },
				path: { bsonType: "string" },
				filename: { bsonType: ["string", "null"] },
				size: { bsonType: ["long", "int", "double", "null"] },
				mimeType: { bsonType: ["string", "null"] },
				checksum: { bsonType: ["string", "null"] },
				storageProvider: { bsonType: ["string", "null"] },
				storageKey: { bsonType: ["string", "null"] },
				tags: { bsonType: ["array", "null"], items: { bsonType: "string" } },
				uploadedAt: { bsonType: "date" },
				updatedAt: { bsonType: "date" },
				deletedAt: { bsonType: ["date", "null"] },
				meta: { bsonType: ["object", "null"] },
			},
			additionalProperties: true,
		},
	},
	validationLevel: "moderate",
});
await db.collection("file_metadata").createIndex({ userId: 1, path: 1 }, { unique: true });
await db.collection("file_metadata").createIndex({ userId: 1, uploadedAt: -1 });

console.log(`Mongo initialized: db=${dbName} collections=user_details,cloud_credentials,file_metadata`);
await client.close();
