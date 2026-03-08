import React, { useState, useEffect, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView,
    ActivityIndicator, Modal, TextInput, Alert, StatusBar, Platform, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import { useNavigation } from '@react-navigation/native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';
import { encryptFile, generateHash, decryptFile } from '../utils/encryption';

const { width } = Dimensions.get('window');

const CLOUD_PROVIDERS = [
    { id: 'all', name: 'All Clouds', icon: 'cloud-done-outline', color: '#00E676' },
    { id: 'googledrive', name: 'Google Drive', icon: 'logo-google', color: '#4285F4' },
    { id: 'dropbox', name: 'Dropbox', icon: 'logo-dropbox', color: '#0061FF' },
    { id: 'mega', name: 'Mega', icon: 'cloud-circle', color: '#D9272E' },
    { id: 'cloudinary', name: 'Cloudinary', icon: 'image-outline', color: '#3448C5' },
];

export default function FilesScreen() {
    const navigation = useNavigation();
    const { colors, spacing, radius, shadow, typography, userData, setUserData, isDark, updateUserSettings, addNotification, viewCloudFilter, setViewCloudFilter } = useTheme();
    const [files, setFiles] = useState([]);
    // ... rest same
    const [initialLoading, setInitialLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCloudPicker, setShowCloudPicker] = useState(false);
    const [activeFile, setActiveFile] = useState(null);
    const [sortBy, setSortBy] = useState('date'); // 'name', 'size', 'date'
    const [connectedClouds, setConnectedClouds] = useState([]);

    // New states for folder navigation
    const [currentFolderId, setCurrentFolderId] = useState(null);
    const [isSharing, setIsSharing] = useState(false);

    // New states for folder creation
    const [folderModalVisible, setFolderModalVisible] = useState(false);
    const [moveModalVisible, setMoveModalVisible] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [infoModalVisible, setInfoModalVisible] = useState(false);
    const [infoFile, setInfoFile] = useState(null);
    const [renameModalVisible, setRenameModalVisible] = useState(false);
    const [renamingFile, setRenamingFile] = useState(null);
    const [newFileName, setNewFileName] = useState('');

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const fetchConnectedClouds = async () => {
        try {
            const response = await fetch(`${API_BASE}/api/cloud/credentials`, {
                headers: { 'Authorization': `Bearer ${userData.token}` }
            });
            const data = await response.json();
            if (data.success) {
                const clouds = data.connections.map(c => c.cloudName.toLowerCase());
                setConnectedClouds(clouds);

                // Check if default cloud is connected
                const defaultCloud = userData.defaultCloud?.toLowerCase() || 'cloudinary';
                if (!clouds.includes(defaultCloud)) {
                    addNotification({
                        type: 'warning',
                        title: 'Setup Required',
                        message: `Please configure credentials for your default cloud: ${defaultCloud.toUpperCase()}`,
                        icon: 'alert-circle-outline',
                        color: colors.warning
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch connected clouds:', err);
        }
    };

    const handleCloudSelect = (id) => {
        setViewCloudFilter(id);
        setShowCloudPicker(false);
        // Removed: updateUserSettings({ defaultCloud: id }); - We don't want to change the default upload cloud when filtering views
    };

    const fetchFiles = async () => {
        try {
            if (!userData.token) return;
            const url = `${API_BASE}/api/files`;
            console.log('📡 Fetching files from:', url);
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${userData.token}` }
            });

            const rawText = await response.text();
            console.log('🔍 Raw Files Response:', rawText.substring(0, 200));

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error('❌ Failed to parse JSON:', e.message);
                throw new Error('Server returned invalid data format (HTML instead of JSON)');
            }

            if (data.success) {
                const mappedFiles = (data.files || []).map(f => ({
                    id: f._id,
                    name: f.fileName,
                    size: formatFileSize(f.fileSize),
                    rawSize: f.fileSize,
                    date: new Date(f.uploadTimestamp).toLocaleDateString(),
                    rawDate: f.uploadTimestamp,
                    type: f.fileType === 'folder' ? 'folder' : (f.fileType?.includes('image') ? 'image' : (f.fileType?.includes('pdf') ? 'pdf' : 'file')),
                    cloud: f.cloud?.toLowerCase() || 'unknown',
                    fileType: f.fileType,
                    encrypted: f.encrypted,
                    hash: f.hash,
                    priority: f.priority,
                    version: f.version,
                    url: f.url,
                    aesKey: f.aesKey,
                    iv: f.iv,
                    parentFolderId: f.parentFolderId || null,
                    scanStatus: f.scanStatus,
                    scanResult: f.scanResult
                }));
                setFiles(mappedFiles);
            }
        } catch (error) {
            console.error('Fetch files failed:', error);
        } finally {
            setInitialLoading(false);
            setRefreshing(false);
        }
    };

    const goBack = () => {
        if (!currentFolderId) return;
        const currentFolder = files.find(f => f.id === currentFolderId);
        setCurrentFolderId(currentFolder?.parentFolderId || null);
    };

    const handleFolderPress = (folder) => {
        setCurrentFolderId(folder.id);
    };

    useEffect(() => {
        fetchFiles();
        fetchConnectedClouds();
    }, [userData.token]);

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleFileUpload = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;
            const asset = result.assets[0];
            await performUpload(asset, false);
        } catch (err) {
            console.error('File picker error:', err);
        }
    };

    const performUpload = async (asset, bypassThreat = false) => {
        try {
            // Prepare matching backend requirements (cloud field)
            const targetCloud = viewCloudFilter !== 'all' ? viewCloudFilter : (userData.defaultCloud || 'cloudinary');

            if (!connectedClouds.includes(targetCloud.toLowerCase())) {
                Alert.alert(
                    "Cloud Not Setup",
                    `You haven't configured credentials for ${targetCloud.toUpperCase()}. Please go to Cloud Setup to connect your account.`,
                    [{ text: "OK" }]
                );
                addNotification({
                    type: 'warning',
                    title: 'Cloud Not Connected',
                    message: `Please connect your ${targetCloud.toUpperCase()} account.`,
                    icon: 'cloud-offline-outline',
                    color: colors.warning
                });
                return;
            }

            setInitialLoading(true);

            // Get file info for lastModified
            const fileInfo = await FileSystem.getInfoAsync(asset.uri);
            const lastModified = fileInfo.exists ? fileInfo.modificationTime : Date.now();

            const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            const decodedName = decodeURIComponent(asset.name || 'unnamed_file');

            const uploadPayload = {
                fileName: decodedName,
                fileType: asset.mimeType || 'application/octet-stream',
                fileSize: asset.size,
                cloud: targetCloud,
                encrypted: false,
                hash: '',
                priority: 'normal',
                reason: 'User manual upload',
                version: 1,
                lastModified: lastModified
            };

            let uploadUri = asset.uri;
            let tempFileUri = null;

            if (userData.aesEncryptionEnabled) {
                console.log('🔐 Encrypting file before upload...');
                const encrypted = await encryptFile(base64Data, decodedName);
                uploadPayload.encrypted = true;
                uploadPayload.aesKey = encrypted.key;
                uploadPayload.iv = encrypted.iv;
                uploadPayload.hash = encrypted.sha256;
                const safeTempName = decodedName.replace(/[^\w.-]+/g, '_');
                tempFileUri = `${FileSystem.cacheDirectory}${safeTempName}.enc`;
                await FileSystem.writeAsStringAsync(tempFileUri, encrypted.encryptedData, { encoding: FileSystem.EncodingType.Base64 });
                uploadUri = tempFileUri;
            } else {
                console.log('📂 Calculating hash for duplication check...');
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
            formData.append('version', uploadPayload.version.toString());
            formData.append('lastModified', new Date(uploadPayload.lastModified).toISOString());
            formData.append('sha256', uploadPayload.hash);
            formData.append('forceUpload', 'true');
            if (bypassThreat) {
                formData.append('bypassThreat', 'true');
            }
            if (currentFolderId) {
                formData.append('parentFolderId', currentFolderId);
            }

            if (uploadPayload.encrypted) {
                formData.append('aesKey', uploadPayload.aesKey);
                formData.append('iv', uploadPayload.iv);
            }

            formData.append('file', {
                uri: Platform.OS === 'android' ? uploadUri : uploadUri.replace('file://', ''),
                name: decodedName,
                type: asset.mimeType || 'application/octet-stream'
            });

            const url = `${API_BASE}/api/upload`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${userData.token}` },
                body: formData
            });

            if (tempFileUri) {
                await FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => { });
            }

            const rawText = await response.text();
            let resData;
            try {
                resData = JSON.parse(rawText);
            } catch (e) {
                throw new Error('Upload failed: Server returned invalid response');
            }

            if (resData.status === 'threat_detected') {
                setInitialLoading(false);
                addNotification({
                    id: Date.now(),
                    type: 'danger',
                    title: 'Security Risk Detected',
                    message: `Security Threat Blocked: "${decodedName}" was identified as a high-risk file. Please review your security settings.`,
                    icon: 'warning-outline',
                    color: colors.danger,
                    actions: [
                        { label: 'Review', type: 'danger' },
                        { label: 'Reject', type: 'primary' }
                    ]
                });
                Alert.alert(
                    '⚠️ SECURITY RISK',
                    `This file is rank as a malicusous file. Do you want to upload or reject this file?`,
                    [
                        {
                            text: 'Reject',
                            style: 'cancel',
                            onPress: () => {
                                addNotification({
                                    type: 'info',
                                    title: 'Backup Cancelled',
                                    message: `File "${decodedName}" was rejected due to security risk.`,
                                    icon: 'close-circle-outline',
                                    color: colors.info
                                });
                            }
                        },
                        {
                            text: 'Backup Anyway',
                            style: 'destructive',
                            onPress: () => performUpload(asset, true)
                        }
                    ]
                );
                return;
            }

            if (resData.status === 'success') {
                if (resData.duplicate) {
                    addNotification({
                        type: 'info',
                        title: 'File Deduplicated',
                        message: `"${decodedName}" already exists. Reusing existing content.`,
                        icon: 'copy-outline',
                        color: colors.info
                    });
                } else {
                    Alert.alert('Success', resData.message);
                    addNotification({
                        type: 'success',
                        title: resData.version > 1 ? 'File Updated' : 'Upload Complete',
                        message: resData.message,
                        icon: resData.version > 1 ? 'refresh-circle-outline' : 'cloud-done-outline',
                        color: colors.success
                    });
                }
                fetchFiles();
            } else {
                throw new Error(resData.message || resData.error || 'Upload failed');
            }
        } catch (err) {
            console.error('Upload error:', err);
            Alert.alert('Upload Failed', err.message);
            addNotification({
                type: 'danger',
                title: 'Upload Failed',
                message: err.message,
                icon: 'warning-outline',
                color: colors.danger
            });
        } finally {
            setInitialLoading(false);
        }
    };

    const handleFileAction = async (file, actionName) => {
        if (isSharing) return;
        try {
            setIsSharing(true);
            setInitialLoading(true);
            const fileUri = `${FileSystem.cacheDirectory}${file.name}`;

            console.log(`📡 Downloading file: ${file.name} from ${file.url}`);

            // 1. Download the file
            const downloadRes = await FileSystem.downloadAsync(file.url, fileUri);

            if (downloadRes.status !== 200) {
                throw new Error('Failed to download file from cloud storage');
            }

            let finalUri = downloadRes.uri;

            // 2. Decrypt if needed
            if (file.encrypted) {
                console.log('🔐 Decrypting downloaded file...');
                if (!file.aesKey || !file.iv) {
                    throw new Error('Missing decryption keys for this file.');
                }

                const encryptedData = await FileSystem.readAsStringAsync(finalUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const decryptedBase64 = decryptFile(encryptedData, file.aesKey, file.iv);

                const decryptedUri = `${FileSystem.cacheDirectory}decrypted_${file.name}`;
                await FileSystem.writeAsStringAsync(decryptedUri, decryptedBase64, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                finalUri = decryptedUri;
            }

            // 3. Perform action
            const isSharingAvailable = await Sharing.isAvailableAsync();
            if (isSharingAvailable) {
                await Sharing.shareAsync(finalUri, {
                    mimeType: file.fileType,
                    dialogTitle: `${actionName}: ${file.name}`,
                    UTI: file.fileType // for iOS
                });
            } else {
                Alert.alert('Download Complete', `File saved to ${finalUri}`);
            }

            setActiveFile(null);
        } catch (error) {
            console.error('File action error:', error);
            Alert.alert('Action Failed', error.message);
        } finally {
            setInitialLoading(false);
            setIsSharing(false);
        }
    };

    const handleDelete = async (file) => {
        Alert.alert(
            'Delete File',
            `Are you sure you want to delete "${file.name}"?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const response = await fetch(`${API_BASE}/api/files/${file.id}`, {
                                method: 'DELETE',
                                headers: { 'Authorization': `Bearer ${userData.token}` }
                            });
                            const data = await response.json();
                            if (data.success) {
                                fetchFiles();
                                addNotification({
                                    type: 'danger',
                                    title: 'File Deleted',
                                    message: `"${file.name}" has been permanently removed.`,
                                    icon: 'trash-outline',
                                    color: colors.danger
                                });
                                setActiveFile(null);
                            }
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete file');
                            addNotification({
                                type: 'danger',
                                title: 'Deletion Failed',
                                message: 'An error occurred while trying to delete the file.',
                                icon: 'alert-circle-outline',
                                color: colors.danger
                            });
                        }
                    }
                }
            ]
        );
    };

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;

        try {
            setInitialLoading(true);
            const response = await fetch(`${API_BASE}/api/files/folder`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify({
                    folderName: newFolderName.trim(),
                    parentFolderId: currentFolderId
                })
            });

            const data = await response.json();

            if (data.success) {
                fetchFiles();
                setNewFolderName('');
                setFolderModalVisible(false);
            } else {
                Alert.alert('Error', data.error || 'Failed to create folder');
            }
        } catch (error) {
            console.error('Folder creation error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setInitialLoading(false);
        }
    };

    const getFileIcon = (type) => {
        if (type === 'folder') return 'folder';
        switch (type) {
            case 'pdf': return 'document-text';
            case 'image': return 'image';
            default: return 'document';
        }
    };

    const handleMoveFile = async (targetFolderId) => {
        if (!activeFile) return;

        try {
            setInitialLoading(true);
            const response = await fetch(`${API_BASE}/api/files/move`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify({
                    fileId: activeFile.id,
                    targetFolderId: targetFolderId
                })
            });

            const data = await response.json();

            if (data.success) {
                fetchFiles();
                setMoveModalVisible(false);
                setActiveFile(null);
            } else {
                Alert.alert('Error', data.error || 'Failed to move file');
            }
        } catch (error) {
            console.error('Move error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleRename = async () => {
        if (!newFileName.trim() || !renamingFile) return;

        try {
            setInitialLoading(true);
            const response = await fetch(`${API_BASE}/api/files/${renamingFile.id}/rename`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify({ newName: newFileName.trim() })
            });

            const data = await response.json();

            if (data.success) {
                fetchFiles();
                setRenameModalVisible(false);
                setRenamingFile(null);
                setNewFileName('');
            } else {
                Alert.alert('Error', data.error || 'Failed to rename');
            }
        } catch (error) {
            console.error('Rename error:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        } finally {
            setInitialLoading(false);
        }
    };

    const filteredFiles = useMemo(() => {
        const result = files.filter(f => {
            const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCloud = viewCloudFilter === 'all' || f.cloud === viewCloudFilter;
            const matchesFolder = f.parentFolderId === currentFolderId;
            return matchesSearch && matchesCloud && matchesFolder;
        });

        return result.sort((a, b) => {
            // Folders always at the top
            if (a.type === 'folder' && b.type !== 'folder') return -1;
            if (a.type !== 'folder' && b.type === 'folder') return 1;

            // Then apply chosen sort criteria
            if (sortBy === 'name') return a.name.localeCompare(b.name);
            if (sortBy === 'size') return b.rawSize - a.rawSize;
            return new Date(b.rawDate) - new Date(a.rawDate);
        });
    }, [files, searchQuery, viewCloudFilter, sortBy, currentFolderId]);

    const getSelectedProviderName = () => {
        const p = CLOUD_PROVIDERS.find(cp => cp.id === viewCloudFilter);
        return p ? p.name : 'All Clouds';
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle="light-content" />

            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={styles.rootGradient}
            />

            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Files</Text>
                        <TouchableOpacity
                            style={styles.cloudSelector}
                            onPress={() => setShowCloudPicker(true)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={CLOUD_PROVIDERS.find(p => p.id === viewCloudFilter)?.icon || 'cloud-outline'}
                                size={18}
                                color={colors.accentPrimary}
                            />
                            <Text style={[styles.cloudSelectorText, { color: colors.accentPrimary }]}>
                                {getSelectedProviderName()}
                            </Text>
                            <Ionicons name="chevron-down" size={16} color={colors.accentPrimary} />
                        </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                            style={styles.aiSearchBtn}
                            onPress={() => navigation.navigate('PromptSearch')}
                        >
                            <Ionicons name="color-wand-outline" size={26} color={colors.accentPrimary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.aiSearchBtn}
                            onPress={handleFileUpload}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-outline" size={28} color={colors.accentPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search Box */}
                <View style={[styles.searchBox, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                    <Ionicons name="search" size={20} color={colors.textDim} />
                    <TextInput
                        style={[styles.searchInput, { color: colors.textPrimary }]}
                        placeholder="Search your secure vault..."
                        placeholderTextColor={colors.textDim}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                            <Ionicons name="close-circle" size={18} color={colors.textDim} />
                        </TouchableOpacity>
                    )}
                </View>

                {/* PREMIUM ACTION BAR (Restored) */}
                <View style={styles.actionBar}>
                    <TouchableOpacity
                        style={[styles.actionTag, { backgroundColor: colors.bgCard }]}
                        onPress={() => setFolderModalVisible(true)}
                    >
                        <Ionicons name="add-circle-outline" size={16} color={colors.textPrimary} />
                        <Text style={[styles.actionTagText, { color: colors.textPrimary }]}>New Folder</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.actionTag, { backgroundColor: colors.bgCard }]}
                        onPress={() => setSortBy(sortBy === 'date' ? 'name' : (sortBy === 'name' ? 'size' : 'date'))}
                    >
                        <Ionicons name="funnel-outline" size={16} color={colors.textPrimary} />
                        <Text style={[styles.actionTagText, { color: colors.textPrimary }]}>Sort: {sortBy.toUpperCase()}</Text>
                    </TouchableOpacity>
                </View>

                {/* File List Section */}
                {initialLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.accentPrimary} />
                        <Text style={[styles.loadingText, { color: colors.textDim }]}>Synchronizing Vault...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredFiles}
                        keyExtractor={item => item.id}
                        refreshing={refreshing}
                        onRefresh={() => { setRefreshing(true); fetchFiles(); }}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={
                            <View>
                                {/* Breadcrumbs / Path Navigation */}
                                <View style={styles.breadcrumbWrapper}>
                                    <View style={[styles.breadcrumbContainer, { backgroundColor: colors.bgCard2 }]}>
                                        <TouchableOpacity onPress={() => setCurrentFolderId(null)} style={styles.breadcrumbItem}>
                                            <Text style={[styles.breadcrumbText, !currentFolderId ? { color: colors.accentPrimary } : { color: colors.textDim }]}>My Files</Text>
                                        </TouchableOpacity>
                                        {currentFolderId && (
                                            <View style={styles.breadcrumbRow}>
                                                <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                                                <Text style={[styles.breadcrumbText, { color: colors.accentPrimary, fontWeight: '700' }]} numberOfLines={1}>
                                                    {files.find(f => f.id === currentFolderId)?.name || 'Folder'}
                                                </Text>
                                            </View>
                                        )}
                                    </View>

                                    {currentFolderId && (
                                        <TouchableOpacity
                                            style={[styles.backIconBtn, { backgroundColor: colors.bgCard2 }]}
                                            onPress={goBack}
                                        >
                                            <Ionicons name="arrow-up" size={18} color={colors.accentPrimary} />
                                            <Text style={[styles.backIconText, { color: colors.accentPrimary }]}>Back</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>
                        }
                        renderItem={({ item }) => {
                            const provider = CLOUD_PROVIDERS.find(p => p.id === item.cloud);
                            return (
                                <TouchableOpacity
                                    style={[styles.fileRow, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}
                                    onPress={() => item.type === 'folder' ? handleFolderPress(item) : setActiveFile(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[styles.iconBox, { backgroundColor: item.type === 'folder' ? colors.bgCard2 : 'rgba(255,255,255,0.03)' }]}>
                                        <Ionicons name={getFileIcon(item.type)} size={26} color={colors.accentPrimary} />
                                    </View>
                                    <View style={styles.fileInfo}>
                                        <View style={styles.fileNameContainer}>
                                            <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                                            {item.scanResult?.malicious > 0 && (
                                                <Ionicons name="alert-circle-outline" size={18} color={colors.danger} />
                                            )}
                                        </View>
                                        <View style={styles.fileMetaRow}>
                                            <Text style={[styles.fileMeta, { color: colors.textMuted }]}>
                                                {item.type === 'folder' ? 'DIRECTORY' : item.size}
                                            </Text>
                                            {provider && (
                                                <View style={[styles.miniBadge, { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1 }]}>
                                                    <Ionicons name={provider.icon} size={10} color={colors.accentPrimary} />
                                                    <Text style={[styles.miniBadgeText, { color: colors.textMuted }]}>{provider.name}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.moreBtn}
                                        onPress={() => setActiveFile(item)}
                                    >
                                        <Ionicons name="ellipsis-horizontal" size={20} color={colors.textDim} />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Ionicons name={currentFolderId ? "folder-open-outline" : "cloud-offline-outline"} size={80} color={colors.textDim} />
                                <Text style={[styles.emptyText, { color: colors.textDim }]}>
                                    {currentFolderId ? "This folder is empty" : "No secure files detected"}
                                </Text>
                                <TouchableOpacity
                                    style={[styles.emptyAction, { backgroundColor: colors.accentPrimary }]}
                                    onPress={handleFileUpload}
                                >
                                    <Text style={styles.emptyActionText}>Upload {currentFolderId ? 'to Folder' : 'First File'}</Text>
                                </TouchableOpacity>
                            </View>
                        }
                    />
                )
                }

                {/* Cloud Picker Modal */}
                <Modal visible={showCloudPicker} transparent animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCloudPicker(false)}>
                        <View style={[styles.pickerContent, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Vault</Text>
                            {CLOUD_PROVIDERS.map(p => (
                                <TouchableOpacity
                                    key={p.id}
                                    style={[styles.pickerItem, viewCloudFilter === p.id && { backgroundColor: colors.bgCard2 }]}
                                    onPress={() => handleCloudSelect(p.id)}
                                >
                                    <View style={[styles.pickerIcon, { backgroundColor: p.color + '20' }]}>
                                        <Ionicons name={p.icon} size={20} color={p.color} />
                                    </View>
                                    <Text style={[styles.pickerText, { color: colors.textPrimary }]}>{p.name}</Text>
                                    {viewCloudFilter === p.id && <Ionicons name="checkmark-circle" size={22} color={colors.accentPrimary} />}
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Create Folder Modal */}
                <Modal visible={folderModalVisible} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setFolderModalVisible(false)}>
                        <View style={[styles.actionSheet, { backgroundColor: colors.bgCard }]}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Create New Folder</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.bgCard2, color: colors.textPrimary, borderColor: colors.bgCardBorder }]}
                                placeholder="Folder name..."
                                placeholderTextColor={colors.textDim}
                                value={newFolderName}
                                onChangeText={setNewFolderName}
                                autoFocus
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.bgCard2 }]} onPress={() => setFolderModalVisible(false)}>
                                    <Text style={{ color: colors.textPrimary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accentPrimary }]} onPress={handleCreateFolder}>
                                    <Text style={{ color: '#000', fontWeight: '800' }}>Create</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Action Sheet Modal */}
                <Modal visible={!!activeFile} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveFile(null)}>
                        <View style={[styles.actionSheet, { backgroundColor: colors.bgCard }]}>
                            <View style={styles.sheetHandle} />
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]} numberOfLines={1}>{activeFile?.name}</Text>

                            <TouchableOpacity style={styles.actionItem} onPress={() => handleFileAction(activeFile, 'Share')}>
                                <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Share Privately</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => handleFileAction(activeFile, 'Download')}>
                                <Ionicons name="download-outline" size={22} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Download & Decrypt</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => setMoveModalVisible(true)}>
                                <Ionicons name="folder-open-outline" size={22} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Move to Folder</Text>
                            </TouchableOpacity>

                            {activeFile?.parentFolderId && (
                                <TouchableOpacity style={styles.actionItem} onPress={() => handleMoveFile(null)}>
                                    <Ionicons name="home-outline" size={22} color={colors.accentPrimary} />
                                    <Text style={[styles.actionText, { color: colors.accentPrimary }]}>Move to Root</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity style={styles.actionItem} onPress={() => { setInfoFile(activeFile); setInfoModalVisible(true); setActiveFile(null); }}>
                                <Ionicons name="information-circle-outline" size={22} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>View Details</Text>
                            </TouchableOpacity>

                            <View style={[styles.sheetDivider, { backgroundColor: colors.bgCardBorder }]} />

                            <TouchableOpacity style={styles.actionItem} onPress={() => { setRenamingFile(activeFile); setNewFileName(activeFile.name); setRenameModalVisible(true); setActiveFile(null); }}>
                                <Ionicons name="pencil-outline" size={22} color={colors.textPrimary} />
                                <Text style={[styles.actionText, { color: colors.textPrimary }]}>Rename</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.actionItem} onPress={() => handleDelete(activeFile)}>
                                <Ionicons name="trash-outline" size={22} color={colors.danger} />
                                <Text style={[styles.actionText, { color: colors.danger }]}>Delete from Vault</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Move Modal */}
                <Modal visible={moveModalVisible} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setMoveModalVisible(false)}>
                        <View style={[styles.actionSheet, { backgroundColor: colors.bgCard }]}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Move to...</Text>
                            <ScrollView style={{ maxHeight: 300 }}>
                                <TouchableOpacity
                                    style={styles.actionItem}
                                    onPress={() => handleMoveFile(null)}
                                >
                                    <Ionicons name="home-outline" size={22} color={colors.accentPrimary} />
                                    <Text style={[styles.actionText, { color: colors.textPrimary }]}>Root Directory</Text>
                                </TouchableOpacity>

                                {files.filter(f => f.fileType === 'folder' && f.id !== activeFile?.id).map(folder => (
                                    <TouchableOpacity
                                        key={folder.id}
                                        style={styles.actionItem}
                                        onPress={() => handleMoveFile(folder.id)}
                                    >
                                        <Ionicons name="folder-outline" size={22} color={colors.accentPrimary} />
                                        <Text style={[styles.actionText, { color: colors.textPrimary }]}>{folder.name}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.bgCard2, marginTop: 10 }]} onPress={() => setMoveModalVisible(false)}>
                                <Text style={{ color: colors.textPrimary }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Info Modal */}
                <Modal visible={infoModalVisible} transparent animationType="fade">
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setInfoModalVisible(false)}
                    >
                        <View style={[styles.infoCard, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                            <View style={styles.infoTitleRow}>
                                <Ionicons name={getFileIcon(infoFile?.type)} size={28} color={colors.accentPrimary} />
                                <Text style={[styles.infoTitle, { color: colors.textPrimary }]} numberOfLines={1}>{infoFile?.name}</Text>
                            </View>

                            <View style={styles.infoDivider} />

                            <View style={styles.infoList}>
                                <InfoRow label="Type" value={infoFile?.type?.toUpperCase()} colors={colors} />
                                <InfoRow label="Size" value={infoFile?.size} colors={colors} />
                                <InfoRow label="Created" value={infoFile?.date} colors={colors} />
                                <InfoRow label="Cloud" value={infoFile?.cloud?.toUpperCase()} colors={colors} />
                                <InfoRow label="Version" value={`v${infoFile?.version || 1}`} colors={colors} />
                                <InfoRow label="Priority" value={infoFile?.priority?.toUpperCase()} colors={colors} />
                                <InfoRow label="Encryption" value={infoFile?.encrypted ? 'AES-256' : 'None'} colors={colors} />
                                <InfoRow label="Importance" value={infoFile?.importanceReason} colors={colors} />
                                {infoFile?.scanStatus === 'completed' && (
                                    <InfoRow
                                        label="Security"
                                        value={infoFile.scanResult?.malicious > 0 ? `THREAT DETECTED (${infoFile.scanResult.malicious})` : 'Clean / Safe'}
                                        colors={colors}
                                        valueStyle={infoFile.scanResult?.malicious > 0 ? { color: colors.danger, fontWeight: '800' } : { color: colors.success }}
                                    />
                                )}
                            </View>

                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: colors.bgCard2 }]}
                                onPress={() => setInfoModalVisible(false)}
                            >
                                <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Rename Modal */}
                <Modal visible={renameModalVisible} transparent animationType="slide">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRenameModalVisible(false)}>
                        <View style={[styles.actionSheet, { backgroundColor: colors.bgCard }]}>
                            <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>Rename {renamingFile?.type === 'folder' ? 'Folder' : 'File'}</Text>
                            <TextInput
                                style={[styles.modalInput, { backgroundColor: colors.bgCard2, color: colors.textPrimary, borderColor: colors.bgCardBorder }]}
                                placeholder="New name..."
                                placeholderTextColor={colors.textDim}
                                value={newFileName}
                                onChangeText={setNewFileName}
                                autoFocus
                            />
                            <View style={styles.modalButtons}>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.bgCard2 }]} onPress={() => setRenameModalVisible(false)}>
                                    <Text style={{ color: colors.textPrimary }}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accentPrimary }]} onPress={handleRename}>
                                    <Text style={{ color: '#000', fontWeight: '800' }}>Rename</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Modal>
            </SafeAreaView >
        </View >
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    rootGradient: { position: 'absolute', top: 0, left: 0, right: 0, height: '40%' },
    container: { flex: 1, paddingHorizontal: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
    headerTitle: { fontSize: 28, fontWeight: '900', letterSpacing: -1 },
    cloudSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    cloudSelectorText: { fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1 },
    cloudChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1.5,
    },
    cloudChipText: { fontSize: 13, fontWeight: '700' },
    uploadBtn: { width: 56, height: 56, borderRadius: 28, elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
    aiSearchBtn: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.1)',
    },

    searchBox: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 16, borderWidth: 1.5, marginBottom: 16 },
    searchInput: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '500' },

    actionBar: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    actionTag: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionTagText: { fontSize: 13, fontWeight: '700' },

    searchClearBtn: { padding: 4 },
    listContent: { paddingBottom: 120, paddingTop: 8 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, fontWeight: '600' },

    fileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
        elevation: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    iconBox: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
    fileInfo: { flex: 1, justifyContent: 'center' },
    fileName: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
    fileNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    fileMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    fileMeta: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    miniBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    miniBadgeText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    moreBtn: { padding: 12, marginRight: -8 },

    emptyState: { alignItems: 'center', marginTop: 80, gap: 16 },
    emptyText: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
    emptyAction: { paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28 },
    emptyActionText: { color: '#000', fontWeight: '800', fontSize: 15 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
    modalTitle: { fontSize: 22, fontWeight: '900', marginBottom: 24, textAlign: 'center' },
    pickerContent: { width: width * 0.85, borderRadius: 24, padding: 24, borderWidth: 1 },
    pickerItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 8, gap: 16 },
    pickerIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    pickerText: { flex: 1, fontSize: 17, fontWeight: '700' },

    actionSheet: { position: 'absolute', bottom: 0, width: '100%', borderTopLeftRadius: 36, borderTopRightRadius: 36, padding: 32, paddingBottom: 56 },
    sheetHandle: { width: 48, height: 5, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 2.5, alignSelf: 'center', marginBottom: 28 },
    actionTitle: { fontSize: 22, fontWeight: '900', marginBottom: 36, textAlign: 'center', letterSpacing: -0.5 },
    actionItem: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingVertical: 20 },
    actionText: { fontSize: 18, fontWeight: '700' },
    sheetDivider: { height: 1.5, marginVertical: 12 },

    modalInput: { height: 58, borderRadius: 18, borderWidth: 1, paddingHorizontal: 20, fontSize: 16, fontWeight: '600', marginBottom: 28 },
    modalButtons: { flexDirection: 'row', gap: 14 },
    modalBtn: { flex: 1, height: 56, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },

    breadcrumbWrapper: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    breadcrumbContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
        gap: 8,
        flex: 1,
        marginRight: 12
    },
    breadcrumbRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
    breadcrumbItem: { paddingVertical: 2 },
    breadcrumbText: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },

    backIconBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14 },
    backIconText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },

    infoCard: { width: width * 0.85, borderRadius: 28, padding: 24, borderWidth: 1 },
    infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
    infoTitle: { flex: 1, fontSize: 18, fontWeight: '800', letterSpacing: -0.5 },
    infoDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 20 },
    infoList: { gap: 16 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    infoLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    infoValue: { fontSize: 14, fontWeight: '600' },
    closeBtn: { marginTop: 32, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});

const InfoRow = ({ label, value, colors, valueStyle = {} }) => (
    <View style={styles.infoRow}>
        <Text style={[styles.infoLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.infoValue, { color: colors.textPrimary }, valueStyle]}>{value || 'N/A'}</Text>
    </View>
);
