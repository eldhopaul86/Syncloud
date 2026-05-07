import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Modal, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { SettingsSection, SettingItem } from '../components/profile/SettingsComponents';

export default function ProfileScreen() {
    const navigation = useNavigation();
    const { colors, spacing, radius, isDark, toggleTheme, userData, updateUserSettings, addNotification } = useTheme();
    const [notifications, setNotifications] = useState(true);
    const [autoBackupModalVisible, setAutoBackupModalVisible] = useState(false);

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const handleLogout = () => {
        navigation.navigate('Auth');
    };


    const ProfileHeader = () => (
        <View style={[styles.profileCard, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
            <View style={styles.userRow}>
                <View style={[styles.avatarBox, { backgroundColor: colors.bgCard2 }]}>
                    <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{userData.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={[styles.username, { color: colors.textPrimary }]}>{userData.fullName}</Text>
                    <Text style={[styles.email, { color: colors.textMuted }]}>{userData.email}</Text>
                    <View style={styles.statusRow}>
                        <View style={[styles.statusDot, { backgroundColor: userData.isVerified ? colors.success : colors.warning }]} />
                        <Text style={[styles.statusText, { color: colors.textMuted }]}>
                            {userData.isVerified ? 'Verified' : 'Unverified'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ marginTop: 24 }}>
                <Text style={[styles.infoTitle, { color: colors.textPrimary }]}>Account Information</Text>

                <View style={styles.infoSection}>
                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoLabel, { color: colors.textDim }]}>Account ID</Text>
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]} numberOfLines={1}>{userData.id}</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoLabel, { color: colors.textDim }]}>Verification Status</Text>
                            <Text style={[styles.infoValue, { color: userData.isVerified ? colors.success : colors.warning }]}>
                                {userData.isVerified ? 'Verified' : 'Pending Verification'}
                            </Text>
                        </View>
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoLabel, { color: colors.textDim }]}>Last Login</Text>
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>N/A</Text>
                        </View>
                    </View>

                    <View style={styles.infoRow}>
                        <View style={styles.infoItem}>
                            <Text style={[styles.infoLabel, { color: colors.textDim }]}>Account Created</Text>
                            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                                {userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-US', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                }) : 'N/A'}
                            </Text>
                        </View>
                    </View>
                </View>

                <Text style={[styles.infoTitle, { color: colors.textPrimary, marginTop: 24 }]}>Security</Text>
                <Text style={[styles.infoLabel, { color: colors.textDim }]}>Password</Text>
                <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                    Last changed: {userData.passwordLastChanged ? new Date(userData.passwordLastChanged).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }) : 'Never'}
                </Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%' }}
            />
            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{ paddingHorizontal: 24, marginTop: 32, marginBottom: 16 }}>
                        <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Profile</Text>
                    </View>

                    <ProfileHeader />

                    <SettingsSection title="Preferences">
                        <SettingItem
                            icon="🔔"
                            label="Notifications"
                            type="toggle"
                            value={notifications}
                            onValueChange={setNotifications}
                        />
                        <SettingItem
                            icon="🌙"
                            label="Dark Mode"
                            type="toggle"
                            value={isDark}
                            onValueChange={toggleTheme}
                        />
                        <SettingItem icon="🌐" label="Language" value="English" />
                        <SettingItem
                            icon="☁️"
                            label="Default Cloud"
                            value={userData.defaultCloud?.toUpperCase() || 'CLOUDINARY'}
                            onPress={() => {
                                const clouds = ['cloudinary', 'googledrive', 'dropbox', 'mega'];
                                const current = userData.defaultCloud?.toLowerCase() || 'cloudinary';
                                const nextIndex = (clouds.indexOf(current) + 1) % clouds.length;
                                updateUserSettings({ defaultCloud: clouds[nextIndex] });
                                Alert.alert('Success', `Backup destination switched to ${clouds[nextIndex].toUpperCase()}`);
                                addNotification({
                                    type: 'success',
                                    title: 'Cloud Updated',
                                    message: `Backup Destination Updated: Your files will now sync to ${clouds[nextIndex].toUpperCase()}.`,
                                    icon: 'swap-horizontal-outline',
                                    color: colors.success
                                }, 2000);
                            }}
                        />
                        <SettingItem
                            icon="⏲️"
                            label="Auto Backup"
                            type="toggle"
                            value={userData.autoBackupEnabled}
                            onValueChange={(val) => {
                                updateUserSettings({ autoBackupEnabled: val });
                                addNotification({
                                    type: val ? 'success' : 'info',
                                    title: val ? 'Auto Backup Active' : 'Auto Backup Paused',
                                    message: val ? 'SynCloud will now periodically scan and backup your important files.' : 'Automatic background scanning has been disabled.',
                                    icon: val ? 'sync-outline' : 'pause-circle-outline',
                                    color: val ? colors.success : colors.textDim
                                }, 2000);
                            }}
                        />
                        <SettingItem
                            icon="📅"
                            label="Backup Interval"
                            value={userData.autoBackupEnabled ? `${userData.autoBackupInterval}` : "N/A"}
                            onPress={() => userData.autoBackupEnabled && setAutoBackupModalVisible(true)}
                            isLast
                        />
                    </SettingsSection>

                    <SettingsSection title="Security">
                        <SettingItem
                            icon="🔐"
                            label="AES Encryption"
                            type="toggle"
                            value={userData.aesEncryptionEnabled}
                            onValueChange={(val) => {
                                updateUserSettings({ aesEncryptionEnabled: val });
                                if (val) {
                                    addNotification({
                                        type: 'success',
                                        title: 'AES Encryption Active',
                                        message: 'Now onward all your files will be stored in cloud in AES-256 encrypted format.',
                                        icon: 'lock-closed-outline',
                                        color: colors.success
                                    }, 2000);
                                } else {
                                    addNotification({
                                        type: 'warning',
                                        title: 'Encryption Disabled',
                                        message: 'Files will now be stored in their original format.',
                                        icon: 'lock-open-outline',
                                        color: colors.warning
                                    }, 2000);
                                }
                            }}
                        />
                        <SettingItem
                            icon="🔑"
                            label="Manage Password"
                            onPress={() => navigation.navigate('ChangePassword')}
                            isLast
                        />
                    </SettingsSection>

                    <SettingsSection title="Support">
                        <SettingItem icon="❓" label="Help Center" />
                        <SettingItem icon="📄" label="Privacy Policy" isLast />
                    </SettingsSection>

                    <View style={{ marginTop: 8 }}>
                        <SettingsSection title="Account Actions">
                            <TouchableOpacity
                                style={[styles.logoutBtn, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '30' }]}
                                onPress={handleLogout}
                            >
                                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                                <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
                            </TouchableOpacity>
                        </SettingsSection>
                    </View>
                </ScrollView>
            </SafeAreaView>

            <Modal
                visible={autoBackupModalVisible}
                transparent
                animationType="slide"
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={() => setAutoBackupModalVisible(false)}
                >
                    <View style={[styles.modalCard, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder, marginTop: 'auto' }]}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Auto Backup</Text>
                                <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Configure background sync</Text>
                            </View>
                            <TouchableOpacity
                                style={[styles.closeBtn, { backgroundColor: colors.bgCard2 }]}
                                onPress={() => setAutoBackupModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={colors.textPrimary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.modalLabel, { color: colors.textMuted }]}>Check Interval</Text>
                                <Text style={{ fontSize: 11, color: colors.textDim, marginBottom: 8 }}>Choose how often SynCloud should scan for new files.</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                    {["1m", "5m", "30m", "1h", "1d"].map((interval) => (
                                        <TouchableOpacity
                                            key={interval}
                                            style={[
                                                styles.intervalTag,
                                                { borderColor: colors.bgCardBorder, backgroundColor: userData.autoBackupInterval === interval ? colors.accentPrimary + '20' : colors.bgCard2 },
                                                userData.autoBackupInterval === interval && { borderColor: colors.accentPrimary }
                                            ]}
                                            onPress={() => updateUserSettings({ autoBackupInterval: interval })}
                                        >
                                            <Text style={{ color: userData.autoBackupInterval === interval ? colors.accentPrimary : colors.textPrimary }}>{interval}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.updateBtn, { backgroundColor: colors.accentPrimary }]}
                                onPress={() => setAutoBackupModalVisible(false)}
                            >
                                <Text style={styles.updateBtnText}>Done</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingBottom: 100 },
    screenTitle: { fontSize: 24, fontWeight: '800', marginBottom: 8 },

    profileCard: { marginHorizontal: 24, marginVertical: 16, padding: 24, borderRadius: 20, borderWidth: 1 },
    userRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    avatarBox: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 28, fontWeight: '700' },
    userInfo: { flex: 1 },
    username: { fontSize: 20, fontWeight: '700' },
    email: { fontSize: 13, marginTop: 2 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 11, fontWeight: '600' },

    infoTitle: { fontSize: 15, fontWeight: '800', marginBottom: 12 },
    infoSection: { gap: 12 },
    infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    infoItem: { minWidth: '45%', flexGrow: 1 },
    infoLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase' },
    infoValue: { fontSize: 13, fontWeight: '600', marginTop: 2 },

    tokenCard: { marginTop: 16, padding: 12, borderRadius: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
    tokenLabel: { fontSize: 12, fontWeight: '700' },
    tokenValue: { fontSize: 10, marginTop: 2 },
    copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    copyText: { fontSize: 11, fontWeight: '600' },

    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 4,
        borderWidth: 1,
        gap: 12,
        marginTop: 8,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalCard: {
        width: '100%',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '900',
    },
    modalSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBody: {
        gap: 16,
    },
    inputGroup: {
        gap: 8,
    },
    modalLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        marginLeft: 4,
    },
    modalInput: {
        height: 54,
        borderRadius: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    updateBtn: {
        height: 54,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
    },
    intervalTag: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    }
});
