import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import Svg, { Circle } from 'react-native-svg';

// Simple Donut Chart Component
// Premium Animated Donut Chart Component
function DonutChart({ progress = 0, size = 70, strokeWidth = 8, color }) {
    const animatedProgress = useRef(new Animated.Value(0)).current;
    const [displayVal, setDisplayVal] = useState(0);

    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;

    useEffect(() => {
        Animated.timing(animatedProgress, {
            toValue: progress,
            duration: 1000,
            useNativeDriver: false,
        }).start();

        animatedProgress.addListener((v) => {
            setDisplayVal(v.value);
        });

        return () => animatedProgress.removeAllListeners();
    }, [progress]);

    const strokeDashoffset = animatedProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [circumference, 0]
    });

    const AnimatedCircle = Animated.createAnimatedComponent(Circle);
    const displayPercent = displayVal > 0 && displayVal < 0.01 ? '< 1' : Math.round(displayVal * 100);

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
                <Circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                <AnimatedCircle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </Svg>
            <View style={{ position: 'absolute', alignItems: 'center' }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: '#FFF' }}>{displayPercent}%</Text>
                <Text style={{ fontSize: 7, color: 'rgba(255,255,255,0.5)', fontWeight: '700', textTransform: 'uppercase' }}>used</Text>
            </View>
        </View>
    );
}

// Animated Counter Component
function AnimatedCounter({ target, duration = 1500, style }) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const end = parseInt(target.toString().replace(/,/g, ''), 10);
        if (start === end) return;

        const incrementTime = (duration / end) * 1000; // time per step
        // Optimization: For large numbers, increment by larger steps
        const stepTime = Math.abs(Math.floor(duration / (end - start)));

        let timer = setInterval(() => {
            start += Math.ceil(end / 100); // 1% increment per tick roughly
            if (start > end) start = end;
            setCount(start);
            if (start === end) clearInterval(timer);
        }, 10);

        return () => clearInterval(timer);
    }, [target, duration]);

    return <Text style={style}>{count.toLocaleString()}</Text>;
}

export default function OverviewGrid({ stats, cloudCount = 0, activeClouds = [] }) {
    const navigation = useNavigation();
    const { colors, shadow, spacing, radius } = useTheme();

    const clouds = [
        { id: 'googledrive', name: 'Google', icon: 'logo-google', color: '#4285F4' },
        { id: 'dropbox', name: 'Dropbox', icon: 'logo-dropbox', color: '#0061FF' },
        { id: 'cloudinary', name: 'Cloudinary', icon: 'cloud-done', color: '#3448C5' },
        { id: 'mega', name: 'Mega', icon: 'shield-checkmark', color: '#D92121' },
    ];

    const filteredData = stats?.viewCloud || stats?.defaultCloud || { name: '...', totalFiles: 0, todayFiles: 0, used: 0, capacity: 0, remaining: 0 };
    const defaultCloudData = stats?.defaultCloud || { name: '...', totalFiles: 0, todayFiles: 0, used: 0, capacity: 0, remaining: 0 };
    const globalStats = stats?.global || { totalFiles: 0, todayFiles: 0 };

    // Total files across all clouds (Global)
    const totalCount = globalStats.totalFiles;
    const totalToday = globalStats.todayFiles;

    // Use defaultCloudData for the ring and index (consistent default view)
    const progress = defaultCloudData.capacity > 0 ? (defaultCloudData.used / defaultCloudData.capacity) : 0;

    // Use defaultCloudData for the Index Card
    const explicitRemaining = Math.max(0, defaultCloudData.capacity - defaultCloudData.used);

    const formatSize = (bytes) => {
        if (!bytes || bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const val = bytes / Math.pow(k, i);
        // Increase precision to show values like 19.99 GB
        const precision = (i >= 2) ? 2 : 1;
        return parseFloat(val.toFixed(precision)) + ' ' + sizes[i];
    };

    const capitalize = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '...');

    return (
        <View style={styles.grid}>
            {/* Row 1: System-wide Stats & Default Storage (Half Width) */}
            <View style={styles.row}>
                {/* Card 1: Global File Count */}
                <View style={[styles.cardHalf, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }, shadow.card]}>
                    <View style={[styles.miniIcon, { backgroundColor: colors.accentTertiary + '20', position: 'absolute', top: 12, right: 12, zIndex: 1 }]}>
                        <Ionicons name="documents" size={14} color={colors.accentTertiary} />
                    </View>
                    <View style={styles.cardHeader}>
                        <View>
                            <Text style={[styles.cardLabel, { color: colors.textMuted }]}>TOTAL FILE COUNT</Text>
                            <Text style={{ fontSize: 9, fontWeight: '600', color: colors.accentPrimary }}>System Wide</Text>
                        </View>
                    </View>
                    <View style={styles.valueContainer}>
                        <AnimatedCounter
                            target={totalCount.toString()}
                            style={[styles.mainValue, { color: colors.textPrimary }]}
                        />
                        <View style={[styles.badge, { backgroundColor: 'rgba(0,230,118,0.1)' }]}>
                            <Text style={[styles.badgeText, { color: '#00E676' }]}>+{totalToday} today</Text>
                        </View>
                    </View>
                </View>

                {/* Card 2: Default Cloud Storage (Used vs Remaining) */}
                <View style={[styles.cardHalf, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }, shadow.card]}>
                    <Text style={[styles.cardLabel, { color: colors.textMuted, marginBottom: 8 }]}>STORAGE USED</Text>
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <DonutChart progress={progress} color={colors.accentPrimary} size={60} strokeWidth={6} />
                        <View style={{ marginTop: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textPrimary }}>
                                {formatSize(defaultCloudData.used)}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Row 2: Current Cloud (Full Width) */}
            < View style={[styles.cardFull, shadow.card, { padding: 0, overflow: 'hidden', borderWidth: 0 }]} >
                <LinearGradient
                    colors={['#009688', '#004D40']} // Deep Teal Gradient
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }} // Horizontal gradient
                    style={{ flex: 1, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                >
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.cardLabel, { color: 'rgba(255,255,255,0.7)' }]}>CURRENT CLOUD INDEX</Text>
                        <Text style={styles.cloudName}>{capitalize(defaultCloudData.name)}</Text>
                        <View style={styles.statusRow}>
                            <View style={[styles.dot, { backgroundColor: activeClouds.includes(defaultCloudData.name?.toLowerCase()) ? '#00E676' : '#FFC107' }]} />
                            <Text style={styles.statusText}>
                                {activeClouds.includes(defaultCloudData.name?.toLowerCase()) ? 'Active Connection' : 'Not activated'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.leftInfo}>
                        <Text style={styles.leftLabel}>REMAIN</Text>
                        <Text style={styles.leftValue}>{formatSize(explicitRemaining)}</Text>
                        <Text style={styles.leftTotal}>{formatSize(defaultCloudData.used)} Used - {formatSize(defaultCloudData.capacity)} Capacity</Text>
                    </View>
                </LinearGradient>
            </View >

            {/* Row 3: Cloud Setup (Full Width) - Dynamic Badge System */}
            <View style={[styles.cardFull, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder, paddingHorizontal: 16, paddingVertical: 14, height: 90 }, shadow.card]}>
                <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.5 }}>CLOUD SETUP</Text>
                        <Text style={{ fontSize: 10, fontWeight: '600', color: colors.accentPrimary }}>
                            {cloudCount} Active Connections
                        </Text>
                    </View>

                    <View style={styles.badgeList}>
                        {clouds.filter(c => activeClouds.includes(c.id)).length > 0 ? (
                            clouds.filter(c => activeClouds.includes(c.id)).map((c) => (
                                <View key={c.id} style={[styles.pillBadge, { backgroundColor: colors.bgCardBorder }]}>
                                    <View style={[styles.pillDot, { backgroundColor: colors.success }]} />
                                    <Text style={[styles.pillText, { color: colors.textPrimary }]}>{c.name}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={{ fontSize: 11, color: colors.textDim, fontStyle: 'italic' }}>No active storage connected</Text>
                        )}
                    </View>
                </View>
            </View>
        </View >
    );
}

const styles = StyleSheet.create({
    grid: {
        paddingHorizontal: 16,
        gap: 12,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardHalf: {
        flex: 1,
        height: 140,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        justifyContent: 'space-between',
    },
    cardFull: {
        width: '100%',
        height: 110,
        borderRadius: 24,
        borderWidth: 1,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    miniIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    valueContainer: {
        marginTop: 'auto',
    },
    mainValue: {
        fontSize: 24,
        fontWeight: '800',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        alignSelf: 'flex-start',
        marginTop: 6,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    cloudName: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginTop: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
    },
    leftInfo: {
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    leftLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '900',
        letterSpacing: 2,
    },
    leftValue: {
        fontSize: 22,
        color: '#FFF',
        fontWeight: '800',
        marginVertical: 2,
    },
    leftTotal: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
    },
    badgeList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    pillBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 8,
    },
    pillDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '700',
    },
});

