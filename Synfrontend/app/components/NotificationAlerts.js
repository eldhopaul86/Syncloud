import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { BlurView } from 'expo-blur';

export default function NotificationAlerts() {
    const { colors, spacing, radius, notifications, setNotifications } = useTheme();

    if (!notifications || notifications.length === 0) return null;

    const handleAction = (id) => {
        // Simple mock action: remove notification
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <View style={styles.container}>
            {notifications.map((notif) => (
                <View key={notif.id} style={[styles.alertWrapper, { marginBottom: spacing.sm }]}>
                    <BlurView intensity={20} tint="dark" style={[styles.alertCard, { borderRadius: radius.card, borderColor: notif.color + '40' }]}>
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
        paddingHorizontal: 16,
        marginTop: 8,
    },
    alertWrapper: {
        overflow: 'hidden',
        borderRadius: 16,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderWidth: 1,
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
