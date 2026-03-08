import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

export default function RecentFiles() {
    const { colors, spacing, shadow, typography, userData } = useTheme();
    const navigation = useNavigation();
    const isFocused = navigation.isFocused();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);

    const API_BASE = ((process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '')) + '/api/files/recent';

    const fetchRecentFiles = async () => {
        try {
            if (!userData.token) return;
            console.log('📡 Fetching recent files...');
            const response = await fetch(API_BASE, {
                headers: { 'Authorization': `Bearer ${userData.token}` }
            });
            const data = await response.json();
            if (data.success) {
                const recent = (data.files || []).map(f => ({
                    id: f._id,
                    name: f.fileName,
                    size: formatFileSize(f.fileSize),
                    modified: timeSince(new Date(f.uploadTimestamp)),
                    icon: getFileIcon(f.fileType),
                    color: getIconColor(f.fileType, colors),
                    scanResult: f.scanResult
                }));
                setFiles(recent);
            }
        } catch (error) {
            console.error('Fetch recent files failed:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isFocused) {
            fetchRecentFiles();
        }
    }, [isFocused, userData.token]);

    const formatFileSize = (bytes) => {
        if (!bytes) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        // Use 2 decimals for precision as requested
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (mime) => {
        if (!mime) return 'document-outline';
        const type = mime.toLowerCase();
        if (type.includes('image')) return 'image-outline';
        if (type.includes('pdf')) return 'document-text-outline';
        if (type.includes('video')) return 'videocam-outline';
        if (type.includes('audio')) return 'musical-notes-outline';
        if (type.includes('spreadsheet') || type.includes('excel')) return 'stats-chart-outline';
        if (type.includes('presentation') || type.includes('powerpoint')) return 'easel-outline';
        if (type.includes('zip') || type.includes('compressed')) return 'archive-outline';
        if (type === 'folder') return 'folder-outline';
        return 'document-outline';
    };

    const getIconColor = (mime, colors) => {
        if (!mime) return colors.textMuted;
        const type = mime.toLowerCase();
        if (type.includes('image')) return colors.accentPrimary;
        if (type.includes('pdf')) return '#FF3D00'; // Vibrant Red
        if (type.includes('video')) return '#7662ff'; // SynCloud Purple
        if (type.includes('spreadsheet') || type.includes('excel')) return '#00E676'; // Green
        if (type === 'folder') return colors.accentTertiary;
        return colors.accentSecondary;
    };

    const timeSince = (date) => {
        const seconds = Math.floor((new Date() - date) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + "y ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + "mo ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + "d ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + "h ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + "m ago";
        return Math.floor(seconds) + "s ago";
    };

    return (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }, shadow.card]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Files')}>
                    <Text style={[styles.viewAll, { color: colors.accentSecondary }]}>View all →</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={{ padding: 20 }}>
                    <ActivityIndicator size="small" color={colors.accentPrimary} />
                </View>
            ) : files.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent activity</Text>
            ) : (
                files.map((f, i) => (
                    <View key={f.id || i}>
                        <View style={styles.fileRow}>
                            <View style={[styles.iconWrap, { backgroundColor: colors.bgCard2, borderColor: colors.bgCardBorder }]}>
                                <Ionicons name={f.icon} size={20} color={f.color} />
                            </View>
                            <View style={styles.fileInfo}>
                                <View style={styles.fileNameContainer}>
                                    <Text style={[styles.fileName, { color: colors.textPrimary }]} numberOfLines={1}>{f.name}</Text>
                                    {f.scanResult?.malicious > 0 && (
                                        <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
                                    )}
                                </View>
                                <Text style={[styles.fileMeta, { color: colors.textMuted }]}>{f.size} • {f.modified}</Text>
                            </View>
                        </View>
                        {i < files.length - 1 && <View style={[styles.divider, { backgroundColor: colors.bgCardBorder }]} />}
                    </View>
                ))
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        borderRadius: 16,
        padding: 24,
        borderWidth: 1,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    title: { fontSize: 16, fontWeight: '700' },
    viewAll: { fontSize: 12 },
    fileRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 4,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileIcon: { fontSize: 20 },
    fileInfo: { flex: 1, justifyContent: 'center' },
    fileNameContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    fileName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
    fileMeta: { marginTop: 4, fontSize: 11 },
    divider: { height: 1, marginHorizontal: -4, opacity: 0.3 },
    emptyText: { textAlign: 'center', padding: 10, fontSize: 13 }
});
