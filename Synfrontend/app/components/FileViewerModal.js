import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, Image,
    ScrollView, ActivityIndicator, Dimensions, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '../context/ThemeContext';

const { width, height } = Dimensions.get('window');
const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

export default function FileViewerModal({ visible, file, onClose, uri, onDownload }) {
    const { colors, typography, isDark, userData } = useTheme();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (visible && uri && file) {
            loadContent();
        } else {
            setContent(null);
            setError(null);
        }
    }, [visible, uri, file]);

    const loadContent = async () => {
        try {
            setLoading(true);
            setError(null);

            const type = getFileType(file);

            if (type === 'text') {
                const text = await FileSystem.readAsStringAsync(uri);
                setContent(text);
            } else if (type === 'image') {
                setContent(uri);
            } else if (type === 'pdf') {
                if (file.encrypted) {
                    const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
                    setContent(`data:application/pdf;base64,${b64}`);
                } else {
                    setContent(`${API_BASE}/api/files/${file.id}/download`);
                }
            } else {
                setError('Preview not supported for this file type.');
            }
        } catch (err) {
            console.error('Error loading file content:', err);
            setError('Failed to load file content.');
        } finally {
            setLoading(false);
        }
    };

    const getFileType = (file) => {
        const mime = file.fileType?.toLowerCase() || '';
        const name = file.name?.toLowerCase() || '';
        
        if (mime.includes('image') || name.match(/\.(jpg|jpeg|png|gif|webp)$/)) return 'image';
        if (mime.includes('text') || mime.includes('json') || mime.includes('javascript') || name.match(/\.(txt|json|js|md|html|css|py)$/)) return 'text';
        if (mime.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
        return 'other';
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.accentPrimary} />
                    <Text style={[styles.loadingText, { color: colors.textDim }]}>Opening Secure Stream...</Text>
                </View>
            );
        }

        if (error) {
            return (
                <View style={styles.center}>
                    <Ionicons name="alert-circle-outline" size={64} color={colors.danger} />
                    <Text style={[styles.errorText, { color: colors.textPrimary }]}>{error}</Text>
                    <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.bgCard2 }]} onPress={onClose}>
                        <Text style={{ color: colors.textPrimary }}>Close</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        const type = getFileType(file);

        if (type === 'image') {
            return (
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: content }}
                        style={styles.image}
                        resizeMode="contain"
                    />
                </View>
            );
        }

        if (type === 'text') {
            return (
                <ScrollView contentContainerStyle={styles.textScrollContent}>
                    <Text style={[styles.textContent, { color: colors.textPrimary }]}>{content}</Text>
                </ScrollView>
            );
        }

        if (type === 'pdf') {
            if (!content) return null;
            const source = content.startsWith('data:') 
                ? { uri: content } 
                : { uri: content, headers: { 'Authorization': `Bearer ${userData.token}` } };

            return (
                <View style={{ flex: 1 }}>
                    <WebView 
                        source={source} 
                        style={{ flex: 1 }} 
                        scalesPageToFit={true}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                    />
                    <View style={styles.floatingActions}>
                        <TouchableOpacity style={styles.floatingBtn} onPress={onDownload}>
                            <Ionicons name="download-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.floatingBtn}
                            onPress={async () => {
                                await Sharing.shareAsync(uri, {
                                    mimeType: 'application/pdf',
                                    dialogTitle: file.name
                                });
                            }}
                        >
                            <Ionicons name="share-outline" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            );
        }

        return null;
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
                    <View style={[styles.header, { borderBottomColor: colors.bgCardBorder }]}>
                        <View style={styles.headerInfo}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.success} />
                            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                                {file?.name || 'File Preview'}
                            </Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.headerBtn} onPress={onDownload}>
                                <Ionicons name="download-outline" size={24} color={colors.textPrimary} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.headerBtn} onPress={onClose}>
                                <Ionicons name="close" size={28} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.contentArea}>
                        {renderContent()}
                    </View>

                    <View style={[styles.footer, { borderTopColor: colors.bgCardBorder }]}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                            {file?.encrypted ? 'End-to-End Encrypted Preview' : 'Secure Vault Preview'}
                        </Text>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '100%',
        height: '100%',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 50 : 20,
        paddingBottom: 15,
        borderBottomWidth: 1,
    },
    headerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    headerBtn: {
        padding: 5,
    },
    contentArea: {
        flex: 1,
        justifyContent: 'center',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 15,
        fontWeight: '600',
    },
    errorText: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    closeBtn: {
        marginTop: 24,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    imageContainer: {
        flex: 1,
        width: '100%',
    },
    image: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    textScrollContent: {
        padding: 20,
    },
    textContent: {
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        fontSize: 14,
        lineHeight: 20,
    },
    footer: {
        padding: 20,
        alignItems: 'center',
        borderTopWidth: 1,
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    unsupportedText: {
        fontSize: 22,
        fontWeight: '800',
        marginTop: 20,
    },
    unsupportedSubText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    actionBtn: {
        marginTop: 30,
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnText: {
        color: '#000',
        fontWeight: '800',
        fontSize: 15,
    },
    pdfIconContainer: {
        width: 140,
        height: 140,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
        position: 'relative',
    },
    pdfBadge: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#FF3D00',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    pdfBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    floatingActions: {
        position: 'absolute',
        bottom: 40,
        right: 20,
        gap: 15,
    },
    floatingBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    }
});
