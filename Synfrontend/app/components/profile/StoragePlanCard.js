import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ColorsLight, Typography, Spacing, Radius } from '../../theme';

export default function StoragePlanCard() {
    return (
        <View style={styles.container}>
            <LinearGradient
                colors={[ColorsLight.accentCyan, ColorsLight.accentBlue]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.card}
            >
                <View style={styles.content}>
                    <View>
                        <Text style={styles.planLabel}>CURRENT PLAN</Text>
                        <Text style={styles.planTitle}>2TB Pro Plus</Text>
                        <Text style={styles.planExpiry}>Renews on Mar 12, 2026</Text>
                    </View>
                    <View style={styles.chartRing}>
                        <Text style={styles.usagePct}>72%</Text>
                    </View>
                </View>

                <View style={styles.barBg}>
                    <View style={styles.barFill} />
                </View>
                <View style={styles.statsRow}>
                    <Text style={styles.statText}>1.44 TB Used</Text>
                    <Text style={styles.statText}>2 TB Total</Text>
                </View>

                <TouchableOpacity style={styles.upgradeBtn}>
                    <Text style={styles.btnText}>Manage Plan</Text>
                </TouchableOpacity>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { paddingHorizontal: Spacing.md, marginBottom: 24 },
    card: {
        borderRadius: 24, // Curved edges as requested
        padding: Spacing.lg,
        shadowColor: ColorsLight.accentBlue,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    content: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    planLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
    planTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
    planExpiry: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 4 },
    chartRing: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    usagePct: { color: '#FFF', fontWeight: 'bold' },
    barBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, marginBottom: 8 },
    barFill: { width: '72%', height: '100%', backgroundColor: '#FFF', borderRadius: 3 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    statText: { color: '#FFF', fontSize: 12, fontWeight: '500' },
    upgradeBtn: {
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
    },
    btnText: { color: ColorsLight.accentBlue, fontWeight: '700', fontSize: 14 },
});
