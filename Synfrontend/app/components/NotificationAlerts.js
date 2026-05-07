import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';

export default function NotificationAlerts() {
    const { colors, spacing, radius, notifications, dismissNotificationPopup } = useTheme();
    const visibleNotifs = notifications?.filter(n => n.popupVisible) || [];

    if (visibleNotifs.length === 0) return null;

    const handleAction = (id) => {
        dismissNotificationPopup(id);
    };

    return (
        <View style={styles.container}>
            {visibleNotifs.map((notif) => (
                <View key={notif.id} style={[styles.alertWrapper, { marginBottom: spacing.sm }]}>
                    <BlurView intensity={80} tint="dark" style={[styles.alertCard, { borderRadius: radius.card, borderColor: notif.color + '60' }]}>
                        <View style={[styles.iconBox, { backgroundColor: notif.color + '20' }]}>
                            <Ionicons name={notif.icon || 'notifications-outline'} size={22} color={notif.color} />
                        </View>
                        <View style={styles.content}>
                            <Text style={[styles.title, { color: '#FFF' }]}>{notif.title}</Text>
                            <Text style={[styles.message, { color: 'rgba(255,255,255,0.7)' }]} numberOfLines={2}>
                                {notif.message}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: notif.color }]}
                            onPress={() => handleAction(notif.id)}
                        >
                            <Ionicons name="checkmark" size={18} color="#FFF" />
                        </TouchableOpacity>
                    </BlurView>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 85,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        zIndex: 10000,
    },
    alertWrapper: {
        overflow: 'hidden',
        borderRadius: 16,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderWidth: 1.5,
        backgroundColor: 'rgba(20, 25, 20, 0.85)',
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16, // Increased spacing
    },
    content: {
        flex: 1,
        marginRight: 8,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    message: {
        fontSize: 11,
        lineHeight: 14,
    },
    actionBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
