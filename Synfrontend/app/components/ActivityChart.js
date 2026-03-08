import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const CHART_HEIGHT = 100;

export default function ActivityChart({ data = [0, 0, 0, 0, 0, 0, 0] }) {
    const { colors, shadow } = useTheme();
    const animValues = useRef([0, 0, 0, 0, 0, 0, 0].map(() => new Animated.Value(0))).current;

    // Fixed arrangement: Monday to Sunday
    const rollingDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Scale chart dynamically: if all values are low, scale to a base of 10 for visibility.
    // Otherwise scale to the max value in the set.
    const maxValInSet = Math.max(...data);
    const maxValForScale = maxValInSet > 10 ? maxValInSet : 10;

    useEffect(() => {
        const animations = animValues.map((anim, i) =>
            Animated.timing(anim, {
                toValue: data[i] || 0,
                duration: 600,
                delay: i * 80,
                useNativeDriver: false,
            })
        );
        Animated.stagger(80, animations).start();
    }, [data]);

    return (
        <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }, shadow.card]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Weekly Backup Activity</Text>
                <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: colors.accentPrimary }]} />
                    <Text style={[styles.legendText, { color: colors.accentPrimary }]}>Backups</Text>
                </View>
            </View>
            <View style={styles.chart}>
                {animValues.map((anim, i) => {
                    const barHeight = anim.interpolate({
                        inputRange: [0, maxValForScale],
                        outputRange: [4, CHART_HEIGHT],
                    });
                    return (
                        <View key={i} style={styles.barCol}>
                            <View style={styles.barBg}>
                                <Animated.View
                                    style={[
                                        styles.bar,
                                        {
                                            height: barHeight,
                                            backgroundColor: i === data.length - 1 ? colors.accentPrimary : colors.accentSecondary + '60',
                                        },
                                        i === data.length - 1 && { shadowColor: colors.accentPrimary, shadowOpacity: 0.5, shadowRadius: 8, elevation: 4 },
                                    ]}
                                />
                            </View>
                            <Text style={[styles.dayLabel, { color: colors.textMuted }]}>{rollingDays[i]}</Text>
                            <Text style={[styles.barVal, { color: colors.textDim }]}>{data[i] || 0}</Text>
                        </View>
                    );
                })}
            </View>
            <View style={[styles.footer, { borderTopColor: colors.bgCardBorder }]}>
                <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    📈 +18% vs last week — <Text style={{ color: colors.accentPrimary }}>best week this month!</Text>
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 16,
        borderRadius: 24,
        padding: 16,
        borderWidth: 1,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 16, fontWeight: '600' },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { fontSize: 12, fontWeight: '500' },
    chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: CHART_HEIGHT + 40 },
    barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
    barBg: { width: '100%', height: CHART_HEIGHT, justifyContent: 'flex-end', alignItems: 'center' },
    bar: { width: '80%', borderRadius: 8 },
    dayLabel: { marginTop: 6, fontSize: 10, fontWeight: '500' },
    barVal: { fontSize: 10, marginTop: 2 },
    footer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
    footerText: { fontSize: 12 },
});
