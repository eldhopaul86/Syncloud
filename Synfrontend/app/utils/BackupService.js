import * as FileSystem from 'expo-file-system/legacy';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackgroundFetchStatus } from 'expo-background-fetch';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { encryptFile, generateHash } from './encryption';
import * as MediaLibrary from 'expo-media-library';
import * as Notifications from 'expo-notifications';

const BACKUP_TASK_NAME = 'BACKGROUND_BACKUP_TASK';
const MANIFEST_KEY = 'BACKUP_MANIFEST';

// Fake real-time file watcher reference (periodic scan)
let fakeWatcherInterval = null;
let isScanning = false;

const ALLOWED_EXTENSIONS = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.jpg', '.jpeg', '.png', '.txt'
];

const MIME_TYPES = {
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.doc': 'application/msword',
    '.xls': 'application/vnd.ms-excel',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
};

const getMimeType = (fileName) => {
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return MIME_TYPES[ext] || 'application/octet-stream';
};

// Register standard background task logic
TaskManager.defineTask(BACKUP_TASK_NAME, async () => {
    try {
        const userDataRaw = await AsyncStorage.getItem('user_settings');
        if (!userDataRaw) return;
        const userData = JSON.parse(userDataRaw);
        if (!userData.autoBackupEnabled) return;
        await performAutoBackup(userData);
    } catch (error) {
        console.error('❌ Background task failed:', error);
    }
});

let foregroundInterval = null;

export const performAutoBackup = async (userData) => {
    if (isScanning) {
        console.log('⚠️ Scan already in progress. Skipping loop.');
        return [];
    }

    try {
        isScanning = true;
        console.log('🔍 Starting broad auto-backup scan...');
        
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Auto Scan Started",
                body: "SynCloud is scanning for new files to backup.",
            },
            trigger: null,
        });

        const filesToUpload = [];
        let manifest = await AsyncStorage.getItem(MANIFEST_KEY);
        manifest = manifest ? JSON.parse(manifest) : {};

        // Track a static scan epoch per user (First login time)
        // Note: Kept LAST_SCAN_ key for backward compatibility so existing users don't break
        const scanEpochKey = `LAST_SCAN_${userData.id || userData.username || 'default'}`;
        let scanEpochStr = await AsyncStorage.getItem(scanEpochKey);
        
        const userCreatedAt = userData.createdAt ? new Date(userData.createdAt).getTime() : 0;

        // 1. On first login: set a static epoch to avoid full system bulk uploads.
        if (!scanEpochStr) {
            console.log('🆕 First login detected. Setting static scan epoch.');
            scanEpochStr = Date.now().toString();
            await AsyncStorage.setItem(scanEpochKey, scanEpochStr);
            // We NO LONGER return [] here, allowing new files created right after login to be captured seamlessly.
        }

        const scanEpoch = parseInt(scanEpochStr);
        // Effective cutoff ensures we only scan files modified >= user.createdAt AND >= static first login epoch
        const cutoffTimeMs = Math.max(userCreatedAt, scanEpoch);

        console.log(`⏱️ Cutoff active: Account Created -> ${new Date(userCreatedAt).toISOString()} | First Login Epoch -> ${new Date(scanEpoch).toISOString()}`);

        // 2. Comprehensive Directory Scan (Modern + Legacy + System + WhatsApp)
        const DIRECTORIES = [
            'file:///storage/emulated/0/Download/',
            'file:///storage/emulated/0/Documents/',
            'file:///storage/emulated/0/Pictures/',
            'file:///storage/emulated/0/DCIM/',
            'file:///storage/emulated/0/DCIM/Camera/',
            // WhatsApp Modern Paths (Android 11+)
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/',
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/Sent/',
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Images/Private/',
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/',
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Sent/',
            'file:///storage/emulated/0/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Documents/Private/',
            // WhatsApp Legacy Paths
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Images/',
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Images/Sent/',
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Images/Private/',
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Documents/',
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Documents/Sent/',
            'file:///storage/emulated/0/WhatsApp/Media/WhatsApp Documents/Private/'
        ];

        for (let dir of DIRECTORIES) {
            try {
                const files = await FileSystem.readDirectoryAsync(dir).catch(() => null);
                if (!files) continue;

                for (const fileName of files) {
                    if (fileName.startsWith('.') || fileName === 'Android') continue;
                    
                    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
                    if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

                    const uri = dir.endsWith('/') ? `${dir}${fileName}` : `${dir}/${fileName}`;
                    const info = await FileSystem.getInfoAsync(uri).catch(() => ({ exists: false }));

                    if (info.exists && !info.isDirectory) {
                        let modTimeMs = info.modificationTime;
                        if (modTimeMs && modTimeMs < 1e12) {
                            modTimeMs = modTimeMs * 1000;
                        }

                        // Enforce account creation limit
                        if (modTimeMs < userCreatedAt) {
                            continue;
                        }

                        // Detection Logic: Check if file is new or modified
                        const lastProcessed = manifest[uri];
                        
                        // Check if file is already in manifest with same metadata to avoid duplicate detect-logs
                        const isAlreadyHandled = lastProcessed && 
                            lastProcessed.modificationTime === modTimeMs &&
                            lastProcessed.size === info.size &&
                            (lastProcessed.status === 'backed_up' || lastProcessed.status === 'ignored' || lastProcessed.status === 'pending');

                        if (isAlreadyHandled) continue;

                        const isNew = !lastProcessed;
                        const isModified = lastProcessed && (
                            lastProcessed.modificationTime !== info.modificationTime ||
                            lastProcessed.size !== info.size
                        );

                        if (isNew || isModified) {
                            console.log(`🆕 ${isModified ? 'Modified' : 'New'} file detected: ${fileName}`);
                            filesToUpload.push({
                                uri,
                                name: fileName,
                                size: info.size,
                                modificationTime: modTimeMs,
                                type: getMimeType(fileName)
                            });
                        }
                    }
                }
            } catch (e) {
                console.log("Error reading directory:", dir);
            }
        }
        
        console.log(`✅ Directory diffing scan complete.`);



        // 3. Scan Media Library (Photos/Videos) efficiently
        let status = 'undetermined';
        let canAskAgain = true;
        try {
            // Explicitly only ask for 'photo' permission to prevent AUDIO crash
            const perm = await MediaLibrary.getPermissionsAsync(false, ['photo']);
            status = perm.status;
            canAskAgain = perm.canAskAgain;
        } catch (err) {
            console.warn('⚠️ MediaLibrary.getPermissionsAsync rejected:', err.message);
        }
        
        if (status !== 'granted' && canAskAgain) {
            try {
                const result = await MediaLibrary.requestPermissionsAsync(false, ['photo']);
                status = result.status;
            } catch (permError) {
                console.warn('⚠️ MediaLibrary permission request failed:', permError.message);
            }
        }

        if (status === 'granted') {
            try {
                // Just fetch recent items like the "fake watcher" pattern
                const assets = await MediaLibrary.getAssetsAsync({ 
                    first: 1000, 
                    sortBy: [[MediaLibrary.SortBy.creationTime, false]], // Newest first
                    mediaType: [MediaLibrary.MediaType.photo]
                });
                
                console.log(`📸 Fetched ${assets.assets.length} recent media items. Checking against manifest...`);

                for (const asset of assets.assets) {
                    const uri = asset.uri;
                    const fileName = asset.filename;
                    const lastProcessed = manifest[uri];

                    // Enforce account creation limit
                    if (asset.creationTime < userCreatedAt) {
                        continue;
                    }

                    // Detection Logic: Check if asset is new or modified
                    // For MediaLibrary assets, we use creationTime as a proxy for modificationTime if modTime is not available,
                    // but we also check the asset ID.
                    // asset ID.
                    const isNew = !lastProcessed;
                    const isModified = lastProcessed && (
                        (lastProcessed.id && lastProcessed.id !== asset.id) ||
                        (lastProcessed.modificationTime !== asset.creationTime)
                    );
                    
                    const isAlreadyHandled = lastProcessed && !isModified && 
                        (lastProcessed.status === 'backed_up' || lastProcessed.status === 'ignored' || lastProcessed.status === 'pending');

                    if (isAlreadyHandled) continue;

                    if (isNew || isModified) {
                        console.log(`📸 New/Modified media detected: ${fileName}`);
                        filesToUpload.push({
                            uri,
                            name: fileName,
                            size: 0, // Asset size is often not directly available without getAssetInfoAsync
                            modificationTime: asset.creationTime,
                            type: getMimeType(fileName),
                            assetId: asset.id
                        });
                    }
                }
            } catch (mediaError) {
                console.log('Error fetching media assets:', mediaError);
            }
        }

        // 4. Final Deduplication by URI to avoid double-processing (e.g. DCIM found by both scans)
        const uniqueFiles = [];
        const seenUris = new Set();
        for (const file of filesToUpload) {
            if (!seenUris.has(file.uri)) {
                seenUris.add(file.uri);
                uniqueFiles.push(file);
            }
        }

        if (uniqueFiles.length === 0) {
            console.log('✅ No new files found in monitored scope.');
            // Save manifest (in case of manual changes or status updates)
            await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Auto Scan Complete",
                    body: "No new or modified files found to backup.",
                },
                trigger: null,
            });

            return [];
        }

        console.log(`📡 Found ${uniqueFiles.length} unique files to backup...`);
        const uploadedResults = [];
        for (const file of uniqueFiles) {
            const result = await uploadFileSilently(file, userData);
            if (result.data?.duplicate) {
                console.log(`ℹ️ Deduplication: ${file.name} already exists in cloud.`);
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'backed_up'
                };
                
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Auto Backup: Deduplicated",
                        body: `Skipped ${file.name} - identical file already exists in vault.`,
                    },
                    trigger: null,
                });
            } else if (result.data?.updated) {
                console.log(`🔄 Version Replaced: ${file.name} content has been updated.`);
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'backed_up'
                };
                uploadedResults.push(result);

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Auto Backup: Version Updated",
                        body: `Replaced old version: ${file.name} (Updated with new content)`,
                    },
                    trigger: null,
                });
            } else if (result.success) {
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'backed_up'
                };
                uploadedResults.push(result);

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Auto Backup Sync",
                        body: `Verified & Backed up: ${file.name} (Sync Complete)`,
                    },
                    trigger: null,
                });
            } else if (result.data?.status === 'rejected') {
                console.log(`🚫 File rejected by AI: ${file.name} (Score: ${result.data.score})`);
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'ignored'
                };

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Auto Backup: File Ignored",
                        body: `AI skipped ${file.name} (Low Importance Score: ${result.data.score})`,
                    },
                    trigger: null,
                });
            } else if (result.data?.status === 'pending_confirmation') {
                console.log(`⚠️ AI requires confirmation for: ${file.name} (Score: ${result.data.score})`);
                
                // Track pending files in manifest to prevent re-scanning
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'pending'
                };

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Action Required: Backup Sync",
                        body: `AI detected a potentially important file: ${file.name}. Should we back it up?`,
                        data: { file, userData: { id: userData.id, token: userData.token, defaultCloud: userData.defaultCloud } },
                        categoryIdentifier: 'BACKUP_CONFIRMATION',
                    },
                    trigger: null,
                });
            } else if (result.data?.status === 'threat_detected') {
                console.log(`🚫 Security Threat: ${file.name} contains malicious content.`);
                
                manifest[file.uri] = {
                    modificationTime: file.modificationTime,
                    size: file.size,
                    id: file.assetId || null,
                    status: 'ignored'
                };

                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: "Security Threat Blocked",
                        body: `Upload blocked for ${file.name}. Malicious content detected!`,
                        data: { scanResult: result.data.scanResult },
                    },
                    trigger: null,
                });
            }

            // PERSIST IMMEDIATELY after each file to handle app-kills or toggles gracefully
            await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
        }

        // 5. Update Scan Epoch to "Now" to optimize future scans (Restart Time Requirement)
        const nextEpoch = Date.now().toString();
        await AsyncStorage.setItem(scanEpochKey, nextEpoch);
        console.log(`⏱️ Next scan cutoff updated to: ${new Date(parseInt(nextEpoch)).toISOString()}`);

        return uploadedResults;
    } catch (error) {
        console.error('Multi-scope backup failed:', error);
        return [];
    } finally {
        isScanning = false;
    }
};

const uploadFileSilently = async (file, userData) => {
    try {
        const base64Data = await FileSystem.readAsStringAsync(file.uri, {
            encoding: FileSystem.EncodingType.Base64,
        });

        const uploadPayload = {
            fileName: file.name,
            fileType: file.type || 'application/octet-stream',
            fileSize: file.size || 0,
            cloud: userData.defaultCloud || 'cloudinary',
            encrypted: false,
            hash: '',
            priority: 'normal',
            reason: 'System Scheduled Backup',
            forceUpload: 'false',
            isAutoBackup: 'true'
        };

        if (userData.aesEncryptionEnabled) {
            const encrypted = await encryptFile(base64Data, file.name);
            uploadPayload.encrypted = true;
            uploadPayload.aesKey = encrypted.key;
            uploadPayload.iv = encrypted.iv;
            uploadPayload.hash = encrypted.sha256;
        } else {
            uploadPayload.hash = generateHash(base64Data);
        }

        const formData = new FormData();
        formData.append('cloud', uploadPayload.cloud);
        formData.append('fileName', uploadPayload.fileName);
        formData.append('fileSize', uploadPayload.fileSize.toString());
        formData.append('fileType', uploadPayload.fileType);
        formData.append('encrypted', uploadPayload.encrypted.toString());
        formData.append('priority', uploadPayload.priority);
        formData.append('reason', uploadPayload.reason);
        formData.append('sha256', uploadPayload.hash);
        formData.append('forceUpload', uploadPayload.forceUpload);
        formData.append('isAutoBackup', uploadPayload.isAutoBackup);

        if (uploadPayload.encrypted) {
            formData.append('aesKey', uploadPayload.aesKey);
            formData.append('iv', uploadPayload.iv);
        }

        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: uploadPayload.fileType
        });

        const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const responseText = await response.text();
        try {
            const data = JSON.parse(responseText);
            return { success: data.status === 'success', data };
        } catch (parseError) {
            console.error('❌ Upload JSON Parse Error. Server returned:', responseText.substring(0, 200));
            return { success: false, error: 'Malformed server response' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
};

export const confirmPendingBackup = async (file, userData, accept = true) => {
    try {
        let manifest = await AsyncStorage.getItem(MANIFEST_KEY);
        manifest = manifest ? JSON.parse(manifest) : {};

        if (!accept) {
            console.log(`❌ User rejected backup for: ${file.name}`);
            manifest[file.uri] = {
                modificationTime: file.modificationTime,
                size: file.size,
                id: file.assetId || null,
                status: 'ignored'
            };
            await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Backup Ignored",
                    body: `File ${file.name} has been marked as ignored.`,
                },
                trigger: null,
            });
            return;
        }

        console.log(`✅ User accepted backup for: ${file.name}. Re-uploading with override...`);
        
        // Prepare payload with forceUpload: true
        const formData = new FormData();
        formData.append('cloud', userData.defaultCloud || 'cloudinary');
        formData.append('fileName', file.name);
        formData.append('fileSize', (file.size || 0).toString());
        formData.append('fileType', file.type);
        formData.append('encrypted', 'false'); // confirmation flow uses simple upload for now
        formData.append('priority', 'high');
        formData.append('reason', 'User Confirmed Backup');
        formData.append('forceUpload', 'true');
        formData.append('isAutoBackup', 'true');

        formData.append('file', {
            uri: file.uri,
            name: file.name,
            type: file.type
        });

        const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${userData.token}`,
                'Accept': 'application/json'
            },
            body: formData
        });

        const data = await response.json();
        if (data.status === 'success') {
            manifest[file.uri] = {
                modificationTime: file.modificationTime,
                size: file.size,
                id: file.assetId || null,
                status: 'backed_up'
            };
            await AsyncStorage.setItem(MANIFEST_KEY, JSON.stringify(manifest));
            
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Backup Confirmed",
                    body: `Successfully backed up: ${file.name}`,
                },
                trigger: null,
            });
        }
    } catch (error) {
        console.error('Failed to confirm backup:', error);
    }
};


export const startAutoBackupService = async (userData) => {
    try {
        console.log('🚀 Initializing Auto-Backup Service...');

        // 1. Background Task Registration
        if (userData.autoBackupEnabled) {
            await registerBackgroundTasks(userData.autoBackupInterval);
        } else {
            await unregisterBackgroundTasks();
        }

        // 2. Foreground Timer Fallback
        if (foregroundInterval) {
            console.log('🛑 Clearing existing foreground timer');
            clearInterval(foregroundInterval);
            foregroundInterval = null;
        }

        if (fakeWatcherInterval) {
            console.log('🛑 Clearing existing fake watcher');
            clearInterval(fakeWatcherInterval);
            fakeWatcherInterval = null;
        }

        if (userData.autoBackupEnabled) {
            let intervalMs = 15 * 60 * 1000; // Default 15m
            if (userData.autoBackupInterval === '1m') intervalMs = 1 * 60 * 1000;
            if (userData.autoBackupInterval === '5m') intervalMs = 5 * 60 * 1000;
            if (userData.autoBackupInterval === '30m') intervalMs = 30 * 60 * 1000;
            if (userData.autoBackupInterval === '1h') intervalMs = 60 * 60 * 1000;

            console.log(`⏱️ Starting foreground sync timer: every ${intervalMs / 1000}s`);
            foregroundInterval = setInterval(() => {
                console.log('⏰ Foreground auto-backup trigger');
                performAutoBackup(userData);
            }, intervalMs);

            // Run once immediately
            performAutoBackup(userData);

            // Setup fake real-time watcher (periodic scan)
            if (!fakeWatcherInterval) {
                console.log('👁️ Registered periodic fake file watcher (every 60s)');
                fakeWatcherInterval = setInterval(() => {
                    console.log('📸 Fake watcher triggered periodic scan!');
                    performAutoBackup(userData);
                }, 60000);
            }
        }
    } catch (error) {
        console.error('Failed to start backup service:', error);
    }
};

export const stopAutoBackupService = async () => {
    if (foregroundInterval) {
        clearInterval(foregroundInterval);
        foregroundInterval = null;
    }
    if (fakeWatcherInterval) {
        clearInterval(fakeWatcherInterval);
        fakeWatcherInterval = null;
    }
    await unregisterBackgroundTasks();
};

const registerBackgroundTasks = async (interval) => {
    try {
        const status = await BackgroundFetch.getStatusAsync();
        if (status === BackgroundFetchStatus.Restricted || status === BackgroundFetchStatus.Denied) {
            console.warn('Background task is restricted');
            return;
        }

        // Map internal intervals to seconds for BackgroundFetch
        let intervalSeconds = 15 * 60; // Min interval
        if (interval === '30m') intervalSeconds = 30 * 60;
        if (interval === '1h') intervalSeconds = 3600;
        if (interval === '1d') intervalSeconds = 86400;

        await BackgroundFetch.registerTaskAsync(BACKUP_TASK_NAME, {
            minimumInterval: intervalSeconds,
        });

        console.log(`Registered ${BACKUP_TASK_NAME} with interval ${intervalSeconds}s`);
    } catch (err) {
        console.error('Task registration failed:', err);
    }
};

const unregisterBackgroundTasks = async () => {
    try {
        // Check if task is registered before unregistering
        const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKUP_TASK_NAME);
        if (isRegistered) {
            await BackgroundFetch.unregisterTaskAsync(BACKUP_TASK_NAME);
            console.log(`Unregistered ${BACKUP_TASK_NAME}`);
        }
    } catch (err) {
        console.error('Task unregistration failed:', err);
    }
};
