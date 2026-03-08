import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
    KeyboardAvoidingView, Platform, ActivityIndicator,
    Animated, Dimensions, Keyboard
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../context/ThemeContext';
import { decryptFile } from '../utils/encryption';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const CLOUD_PROVIDERS = [
    { id: 'googledrive', name: 'Google Drive', icon: 'logo-google', color: '#4285F4' },
    { id: 'dropbox', name: 'Dropbox', icon: 'logo-dropbox', color: '#0061FF' },
    { id: 'mega', name: 'Mega', icon: 'cloud-circle', color: '#D9272E' },
    { id: 'cloudinary', name: 'Cloudinary', icon: 'image-outline', color: '#3448C5' },
];

export default function PromptSearchScreen() {
    const { colors, spacing, radius, typography, isDark, userData } = useTheme();
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
    const [prompt, setPrompt] = useState('');
    const [messages, setMessages] = useState([
        {
            id: '1',
            type: 'ai',
            content: 'Hello! I am your AI file assistant. You can ask me to find specific files or group them by content. For example, "Show me all travel photos" or "Find documents from this week".',
            timestamp: new Date()
        }
    ]);
    const [isTyping, setIsTyping] = useState(false);
    const [downloadingFileId, setDownloadingFileId] = useState(null);
    const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
    const keyboardPadding = useRef(new Animated.Value(Math.max(insets.bottom, 16))).current;
    const scrollViewRef = useRef();

    const suggestions = [
        "Find PDFs from last week",
        "Show my backup travel photos",
        "Recent tax documents",
        "Large video files"
    ];

    const handleSend = async () => {
        if (!prompt.trim()) return;

        const currentPrompt = prompt.trim();
        const userMsg = {
            id: Date.now().toString(),
            type: 'user',
            content: currentPrompt,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setPrompt('');
        setIsTyping(true);

        try {
            const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
            const response = await fetch(`${API_BASE}/api/search/ai`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify({ query: currentPrompt })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'AI Search failed');
            }

            const aiMsg = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: data.files && data.files.length > 0 ? `I found ${data.files.length} matching files:` : "I couldn't find any files matching your request.",
                files: data.files || [],
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            console.error('AI Search Error:', error);
            const errorMsg = {
                id: (Date.now() + 2).toString(),
                type: 'ai',
                content: `Sorry, I encountered an error: ${error.message}`,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    useEffect(() => {
        const showSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                setIsKeyboardVisible(true);
                Animated.timing(keyboardPadding, {
                    toValue: Platform.OS === 'ios' ? 12 : 16, // Adjusting for platform
                    duration: e.duration || 250,
                    useNativeDriver: false
                }).start();
            }
        );
        const hideSubscription = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            (e) => {
                setIsKeyboardVisible(false);
                Animated.timing(keyboardPadding, {
                    toValue: Math.max(insets.bottom, 16),
                    duration: e.duration || 250,
                    useNativeDriver: false
                }).start();
            }
        );

        return () => {
            showSubscription.remove();
            hideSubscription.remove();
        };
    }, [insets.bottom]);

    const handleSuggestion = (text) => {
        setPrompt(text);
    };

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mimeType) => {
        if (!mimeType) return 'document';
        if (mimeType.includes('image')) return 'image';
        if (mimeType.includes('pdf')) return 'document-text';
        if (mimeType.includes('video')) return 'videocam';
        return 'document';
    };

    const handleFileAction = async (file) => {
        try {
            setDownloadingFileId(file._id);
            const fileUri = `${FileSystem.cacheDirectory}${file.fileName}`;

            console.log(`📡 Downloading file: ${file.fileName} from ${file.url}`);

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

                const decryptedUri = `${FileSystem.cacheDirectory}decrypted_${file.fileName}`;
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
                    dialogTitle: `Open: ${file.fileName}`,
                    UTI: file.fileType // for iOS
                });
            } else {
                Alert.alert('Download Complete', `File saved to ${finalUri}`);
            }
        } catch (error) {
            console.error('File action error:', error);
            Alert.alert('Action Failed', error.message);
        } finally {
            setDownloadingFileId(null);
        }
    };

    const FileResultItem = ({ file }) => {
        const provider = CLOUD_PROVIDERS.find(p => p.id === (file.cloud || '').toLowerCase());
        const isDownloading = downloadingFileId === file._id;

        return (
            <TouchableOpacity
                style={[styles.fileCard, { backgroundColor: colors.bgCard2, borderColor: colors.bgCardBorder }]}
                onPress={() => handleFileAction(file)}
                activeOpacity={0.7}
                disabled={isDownloading}
            >
                <View style={[styles.fileIconBox, { backgroundColor: colors.bgPrimary }]}>
                    <Ionicons name={getFileIcon(file.fileType)} size={24} color={colors.accentPrimary} />
                </View>

                <View style={styles.fileDetails}>
                    <Text style={[styles.fileNameText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {file.fileName}
                    </Text>
                    <View style={styles.fileSubRow}>
                        <Text style={[styles.fileSizeText, { color: colors.textDim }]}>
                            {formatFileSize(file.fileSize)}
                        </Text>
                        <View style={styles.dot} />
                        {provider && (
                            <View style={styles.providerInfo}>
                                <Ionicons name={provider.icon} size={12} color={provider.color} />
                                <Text style={[styles.providerText, { color: colors.textDim }]}>{provider.name}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.fileAction}>
                    {isDownloading ? (
                        <ActivityIndicator size="small" color={colors.accentPrimary} />
                    ) : (
                        <Ionicons name="cloud-download-outline" size={20} color={colors.accentPrimary} />
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={styles.rootGradient}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
                enabled
            >
                {/* Header */}
                <View style={[
                    styles.header,
                    {
                        borderBottomColor: colors.bgCardBorder,
                        paddingTop: insets.top + (spacing.sm || 8),
                        backgroundColor: colors.bgPrimary + 'CC'
                    }
                ]}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <View style={styles.headerInfo}>
                        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Search</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
                            <Text style={[styles.statusText, { color: colors.textDim }]}>Prompt Ready</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.moreBtn}>
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textDim} />
                    </TouchableOpacity>
                </View>

                {/* Chat History */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.chatArea}
                    contentContainerStyle={styles.chatContent}
                    onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
                >
                    {messages.map((msg) => (
                        <View
                            key={msg.id}
                            style={[
                                styles.messageWrapper,
                                msg.type === 'user' ? styles.userWrapper : styles.aiWrapper
                            ]}
                        >
                            {msg.type === 'ai' && (
                                <View style={[styles.aiIcon, { backgroundColor: colors.accentPrimary }]}>
                                    <Ionicons name="color-wand" size={14} color="#000" />
                                </View>
                            )}
                            <View
                                style={[
                                    styles.bubble,
                                    msg.type === 'user'
                                        ? [styles.userBubble, { backgroundColor: colors.accentPrimary }]
                                        : [styles.aiBubble, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.messageText,
                                        { color: msg.type === 'user' ? '#000' : colors.textPrimary }
                                    ]}
                                >
                                    {msg.content}
                                </Text>

                                {msg.files && msg.files.length > 0 && (
                                    <View style={styles.filesContainer}>
                                        {msg.files.map((file) => (
                                            <FileResultItem key={file._id} file={file} />
                                        ))}
                                    </View>
                                )}

                                <Text
                                    style={[
                                        styles.timestamp,
                                        { color: msg.type === 'user' ? 'rgba(0,0,0,0.5)' : colors.textDim }
                                    ]}
                                >
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    ))}
                    {isTyping && (
                        <View style={styles.aiWrapper}>
                            <View style={[styles.aiIcon, { backgroundColor: colors.accentPrimary }]}>
                                <Ionicons name="color-wand" size={14} color="#000" />
                            </View>
                            <View style={[styles.aiBubble, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder, paddingVertical: 12 }]}>
                                <ActivityIndicator size="small" color={colors.accentPrimary} />
                            </View>
                        </View>
                    )}
                </ScrollView>

                {/* Suggestions */}
                <View style={styles.suggestionsContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                        {suggestions.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={[styles.suggestionChip, { backgroundColor: colors.bgCard2, borderColor: colors.bgCardBorder }]}
                                onPress={() => handleSuggestion(item)}
                            >
                                <Text style={[styles.suggestionText, { color: colors.textPrimary }]}>{item}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Input Bar */}
                <Animated.View style={[
                    styles.inputContainer,
                    {
                        backgroundColor: colors.bgPrimary,
                        borderTopColor: colors.bgCardBorder,
                        paddingBottom: keyboardPadding
                    }
                ]}>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                        <TextInput
                            style={[styles.input, { color: colors.textPrimary }]}
                            placeholder="Describe what you're looking for..."
                            placeholderTextColor={colors.textDim}
                            value={prompt}
                            onChangeText={setPrompt}
                            multiline
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendBtn,
                                { backgroundColor: prompt.trim() ? colors.accentPrimary : colors.bgCard2 }
                            ]}
                            onPress={handleSend}
                            disabled={!prompt.trim()}
                        >
                            <Ionicons
                                name="arrow-up"
                                size={20}
                                color={prompt.trim() ? '#000' : colors.textDim}
                            />
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    rootGradient: { position: 'absolute', left: 0, right: 0, top: 0, height: 450 },
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerInfo: { flex: 1, marginLeft: 10 },
    headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 13, fontWeight: '600', opacity: 0.7 },
    moreBtn: { padding: 4 },
    chatArea: { flex: 1 },
    chatContent: { paddingHorizontal: 12, paddingTop: 20, paddingBottom: 60 },
    messageWrapper: { flexDirection: 'row', marginBottom: 28, maxWidth: '95%' },
    userWrapper: { alignSelf: 'flex-end', justifyContent: 'flex-end', paddingLeft: 40 },
    aiWrapper: { alignSelf: 'flex-start', paddingRight: 20 },
    aiIcon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
        marginTop: 4,
    },
    bubble: {
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    userBubble: {
        borderBottomRightRadius: 6,
    },
    aiBubble: {
        borderTopLeftRadius: 6,
        borderBottomLeftRadius: 24,
        borderWidth: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
        letterSpacing: -0.2,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 10,
        alignSelf: 'flex-end',
        opacity: 0.6,
        fontWeight: '600',
    },
    filesContainer: {
        marginTop: 16,
        gap: 12,
        width: width * 0.75, // Explicit width constraints to prevent overflow on tiny screens
    },
    fileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 16,
        borderWidth: 1,
    },
    fileIconBox: {
        width: 42,
        height: 42,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    fileDetails: {
        flex: 1,
        justifyContent: 'center',
    },
    fileNameText: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    fileSubRow: {
        flexDirection: 'row',
        alignItems: 'center',
        opacity: 0.7,
    },
    fileSizeText: {
        fontSize: 11,
        fontWeight: '500',
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: 'rgba(255,255,255,0.3)',
        marginHorizontal: 6,
    },
    providerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    providerText: {
        fontSize: 11,
        fontWeight: '600',
    },
    fileAction: {
        width: 34,
        height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    suggestionsContainer: {
        paddingVertical: 18,
        borderTopWidth: 0,
    },
    suggestionsScroll: {
        paddingHorizontal: 16,
        gap: 10,
    },
    suggestionChip: {
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 25,
        borderWidth: 1,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: '700',
    },
    inputContainer: {
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 20,
        borderTopWidth: 1,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 30,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
        maxHeight: 140,
        paddingTop: 10,
        paddingBottom: 10,
        marginRight: 10,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    }
});
