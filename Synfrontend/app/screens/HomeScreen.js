import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View, Text, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useFocusEffect } from '@react-navigation/native';

import Header from '../components/Header';
import OverviewGrid from '../components/OverviewGrid';
import ActivityChart from '../components/ActivityChart';
import RecentFiles from '../components/RecentFiles';

export default function HomeScreen() {
    const { colors, spacing, radius, userData, isDark, viewCloudFilter, addNotification, notifications, sessionAlertsProcessed, setSessionAlertsProcessed } = useTheme();
    const [cloudCount, setCloudCount] = useState(0);
    const [activeClouds, setActiveClouds] = useState([]);
    const [stats, setStats] = useState({
        global: { totalFiles: 0, todayFiles: 0, totalUsed: 0 },
        defaultCloud: {
            name: 'fetching...',
            totalFiles: 0,
            todayFiles: 0,
            used: 0,
            capacity: 0,
            remaining: 0
        },
        weeklyActivity: [0, 0, 0, 0, 0, 0, 0]
    });

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const fetchClouds = useCallback(async () => {
        try {
            if (!userData.token) return;
            const response = await fetch(`${API_BASE}/api/cloud/credentials`, {
                headers: { 'Authorization': `Bearer ${userData.token}` }
            });
            const data = await response.json();
            if (data.success) {
                setCloudCount(data.connections?.length || 0);
                const clouds = data.connections?.map(c => c.cloudName.toLowerCase()) || [];
                setActiveClouds(data.connections?.map(c => c.cloudName.toLowerCase()) || []);

                // Check default cloud
                const defaultCloud = userData.defaultCloud?.toLowerCase() || 'cloudinary';
                if (!clouds.includes(defaultCloud) && !sessionAlertsProcessed) {
                    addNotification({
                        type: 'warning',
                        title: 'Storage Not Connected',
                        message: `Your default vault (${defaultCloud.toUpperCase()}) needs setup.`,
                        icon: 'alert-circle-outline',
                        color: colors.warning
                    });
                }
            }
        } catch (err) {
            console.error('Failed to fetch clouds:', err);
        }
    }, [userData.token, userData.defaultCloud, API_BASE, colors.warning, addNotification, sessionAlertsProcessed]);

    const fetchStats = useCallback(async () => {
        try {
            if (!userData.token) return;
            const response = await fetch(`${API_BASE}/api/files/stats?cloud=${viewCloudFilter}`, {
                headers: { 'Authorization': `Bearer ${userData.token}` }
            });
            const data = await response.json();
            if (data.success) {
                setStats(data.stats);

                // 🚨 Session-based Alerts (Initial Audit on Login)
                if (!sessionAlertsProcessed) {
                    // 1. Security Threat Warning
                    if (data.stats.global.threatCount > 0) {
                        addNotification({
                            type: 'danger',
                            title: 'Active Security Threat',
                            message: `Warning: ${data.stats.global.threatCount} malicious file(s) detected in your vault. Manual review required.`,
                            icon: 'shield-alert-outline',
                            color: colors.danger,
                            actions: [{ label: 'Review', type: 'danger' }]
                        });
                    }

                    // 2. Storage Capacity Warning
                    const limit = 5 * 1024 * 1024 * 1024;
                    const used = data.stats.global.totalUsed;
                    if (used > limit * 0.9) {
                        addNotification({
                            type: 'danger',
                            title: 'Storage Capacity Warning',
                            message: `Critical: Your cloud vault is ${((used / limit) * 100).toFixed(1)}% full. Consider managing your storage.`,
                            icon: 'disc-outline',
                            color: colors.danger
                        });
                    }

                    // Mark as processed for this login session
                    setSessionAlertsProcessed(true);
                }
            }
        } catch (err) {
            console.error('Failed to fetch stats:', err);
        }
    }, [userData.token, viewCloudFilter, userData.defaultCloud, API_BASE]);

    useFocusEffect(
        useCallback(() => {
            fetchClouds();
            fetchStats();
        }, [fetchClouds, fetchStats])
    );

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.bgPrimary} />

            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={styles.rootGradient}
            />

            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Layout */}
                    <View style={{ paddingBottom: spacing.sm }}>
                        <Header />
                    </View>

                    {/* Hero Card: Greeting */}
                    <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
                        <LinearGradient
                            colors={colors.gradPrimary}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.heroCard,
                                {
                                    padding: spacing.lg,
                                    borderRadius: radius.card,
                                }
                            ]}
                        >
                            <View>
                                <Text style={[styles.subtitle, { color: colors.accentPrimary }]}>WELCOME BACK</Text>
                                <Text style={styles.greeting}>{getGreeting()}, {userData.fullName}</Text>

                                {cloudCount === 0 && (
                                    <View style={styles.warningContainer}>
                                        <Ionicons name="warning-outline" size={16} color="#FFD700" />
                                        <Text style={styles.warningText}>Cloud setup required to upload files</Text>
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Sections with spacing */}
                    <View style={styles.section}>
                        <OverviewGrid stats={stats} cloudCount={cloudCount} activeClouds={activeClouds} />
                    </View>

                    {/* Dynamic Backup Activity */}
                    <View style={styles.section}>
                        <ActivityChart data={stats.weeklyActivity} />
                    </View>

                    <View style={styles.section}>
                        <RecentFiles />
                    </View>

                    {/* Bottom spacer for Tab Bar */}
                    <View style={{ height: 120 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    rootGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 300,
    },
    safeArea: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingBottom: 20 },
    heroCard: {
        marginBottom: 4,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    subtitle: {
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    greeting: {
        fontSize: 26,
        fontWeight: '700',
        color: '#FFF',
        letterSpacing: -0.5,
    },
    section: { marginTop: 12 },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    warningText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#FFD700',
    },
});
