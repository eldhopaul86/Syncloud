import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

export function SettingsSection({ title, children }) {
    const { colors } = useTheme();
    return (
        <View style={styles.section}>
            <Text style={[styles.header, { color: colors.textMuted }]}>{title}</Text>
            <View style={[styles.card, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                {children}
            </View>
        </View>
    );
}

export function SettingItem({ icon, label, value, type = 'arrow', onValueChange, onPress, isLast }) {
    const { colors } = useTheme();
    return (
        <TouchableOpacity
            activeOpacity={0.7}
            disabled={type === 'toggle'}
            onPress={onPress}
            style={[styles.item, { borderBottomColor: colors.bgCardBorder }, isLast && styles.noBorder]}
        >
            <View style={[styles.iconBox, { backgroundColor: colors.bgCard2 }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>

            {type === 'toggle' && (
                <Switch
                    value={value}
                    onValueChange={onValueChange}
                    trackColor={{ false: colors.bgCardBorder, true: colors.accentPrimary }}
                    thumbColor={'#FFF'}
                />
            )}

            {type === 'arrow' && (
                <View style={styles.arrowRow}>
                    {value && <Text style={[styles.valueText, { color: colors.textMuted }]}>{value}</Text>}
                    <Text style={[styles.chevron, { color: colors.textMuted }]}>›</Text>
                </View>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 4, // Sharp edges
        borderWidth: 1,
        paddingVertical: 4,
        paddingHorizontal: 16,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    noBorder: { borderBottomWidth: 0 },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    icon: { fontSize: 16 },
    label: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
    },
    arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    valueText: { fontSize: 14 },
    chevron: { fontSize: 20, fontWeight: '300' },
});
