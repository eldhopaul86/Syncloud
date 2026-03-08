# SynCloud MongoDB schema (syncloud)

MongoDB uses **databases + collections** (not sub-tables).

## Database
- `syncloud`

## Collections

### 1) `user_details`
**Purpose:** signup/login identity + user profile.

**Core fields**
- `_id` (ObjectId)
- `email` (string, unique, required)
- `username` (string, optional, can be unique if you want)
- `passwordHash` (string, required) — bcrypt/argon2 hash only
- `createdAt` (date), `updatedAt` (date)
- `lastLoginAt` (date|null)
- `meta` (object|null) — optional user-related metadata

**Indexes**
- `email` unique
- optional: `username` unique (sparse/partial)

**Example**
```json
{
  "_id": "ObjectId(...)",
  "email": "user@example.com",
  "username": "eldho",
  "passwordHash": "$2b$10$...",
  "createdAt": "2026-02-20T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z",
  "lastLoginAt": null,
  "meta": { "plan": "free" }
}
```

### 2) `cloud_credentials`
**Purpose:** per-user connected cloud accounts (Cloudinary/Mega/Drive/Dropbox/etc).

**Core fields**
- `_id` (ObjectId)
- `userId` (ObjectId, required, references `user_details._id`)
- `provider` (string, required) — e.g. `cloudinary|mega|googledrive|dropbox`
- `label` (string|null) — optional if user can connect multiple accounts per provider
- `encryptedPayload` (Binary|string, required) — encrypted JSON (never store plaintext tokens/passwords)
- `keyId` (string|null) — which key/KMS version encrypted it
- `createdAt` (date), `updatedAt` (date)

**Indexes**
- unique: `(userId, provider, label)` (or `(userId, provider)` if label not used)

**Example (encrypted)**
```json
{
  "_id": "ObjectId(...)",
  "userId": "ObjectId(...)",
  "provider": "dropbox",
  "label": "personal",
  "encryptedPayload": "<encrypted-bytes-or-base64>",
  "keyId": "local-dev",
  "createdAt": "2026-02-20T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z"
}
```

### 3) `file_metadata`
**Purpose:** searchable metadata for each user file.

**Core fields**
- `_id` (ObjectId)
- `userId` (ObjectId, required)
- `path` (string, required) — unique per user (e.g. `/docs/a.pdf`)
- `filename` (string|null)
- `size` (number|null)
- `mimeType` (string|null)
- `checksum` (string|null) — e.g. sha256
- `storageProvider` (string|null) — e.g. `cloudinary|mega|googledrive|dropbox`
- `storageKey` (string|null) — provider object key/blob id
- `tags` (string[]|null)
- `uploadedAt` (date), `updatedAt` (date)
- `deletedAt` (date|null)
- `meta` (object|null) — AI metadata, EXIF, etc.

**Indexes**
- unique: `(userId, path)`
- optional: `(userId, uploadedAt desc)` for listing

**Example**
```json
{
  "_id": "ObjectId(...)",
  "userId": "ObjectId(...)",
  "path": "/invoices/2025-01.pdf",
  "filename": "2025-01.pdf",
  "size": 183331,
  "mimeType": "application/pdf",
  "checksum": "sha256:...",
  "storageProvider": "cloudinary",
  "storageKey": "syncloud/userid/.../2025-01.pdf",
  "tags": ["invoice"],
  "uploadedAt": "2026-02-20T00:00:00.000Z",
  "updatedAt": "2026-02-20T00:00:00.000Z",
  "deletedAt": null,
  "meta": { "importanceScore": 0.82, "reason": "..." }
}
```
