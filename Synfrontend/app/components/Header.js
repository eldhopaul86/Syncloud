import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Dimensions, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export default function Header() {
    const navigation = useNavigation();
    const { colors, spacing, radius, typography, userData, notifications, setNotifications, clearNotifications, setSessionAlertsProcessed } = useTheme();
    const [sidebarVisible, setSidebarVisible] = useState(false);
    const [notifVisible, setNotifVisible] = useState(false);
    const [slideAnim] = useState(new Animated.Value(-Dimensions.get('window').height));

    const toggleSidebar = (visible) => {
        if (visible) {
            setSidebarVisible(true);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                easing: Easing.out(Easing.back(0.5)),
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: -Dimensions.get('window').height,
                duration: 300,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }).start(() => setSidebarVisible(false));
        }
    };

    const menuItems = [
        { name: 'Home', icon: 'home-outline', screen: 'Home' },
        { name: 'My Files', icon: 'folder-outline', screen: 'Files' },
        { name: 'Cloud Setup', icon: 'cloud-upload-outline', screen: 'Cloud' },
        { name: 'Profile', icon: 'person-outline', screen: 'Profile' }
    ];

    const handleNav = (screen) => {
        toggleSidebar(false);
        if (screen) navigation.navigate(screen);
    };

    const handleAction = (notifId, actionLabel) => {
        if (actionLabel === 'Manual Backup' || actionLabel === 'Review' || actionLabel === 'Optimize') {
            setNotifVisible(false);
            navigation.navigate('Files');
        } else if (actionLabel === 'Reject' || actionLabel === 'Dismiss') {
            // Standard dismiss logic
        }

        // Remove the notification after action
        setNotifications(notifications.filter(n => n.id !== notifId));
    };

    const formatTime = (ts) => {
        if (!ts) return '';
        const diff = Math.floor((Date.now() - ts) / 1000);
        if (diff < 60) return 'just now';
        const mins = Math.floor(diff / 60);
        if (mins < 60) return `${mins}m ago`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `${hrs}h ago`;
        return `${Math.floor(hrs / 24)}d ago`;
    };

    const handleLogout = () => {
        setSessionAlertsProcessed(false);
        toggleSidebar(false);
        // Simple navigation to Auth screen
        // In a real app, you'd clear session/tokens here
        navigation.navigate('Auth');
    };

    return (
        <View style={[styles.container, { paddingHorizontal: spacing.md, paddingTop: spacing.md + 6, paddingBottom: spacing.md }]}>
            {/* Sidebar Modal */}
            <Modal
                visible={sidebarVisible}
                transparent={true}
                animationType="none"
                onRequestClose={() => toggleSidebar(false)}
                statusBarTranslucent={true}
            >
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)' }}>
                    <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
                        <LinearGradient
                            colors={[colors.bgPrimary, colors.bgCard]}
                            style={[styles.sidebarFullscreen]}
                        >
                            <SafeAreaView style={{ flex: 1, paddingHorizontal: spacing.lg }}>
                                <View style={[styles.sidebarHeaderNew, { marginTop: spacing.lg, marginBottom: spacing.xl }]}>
                                    <Text style={styles.sidebarTitleNew}>SynCloud</Text>
                                    <TouchableOpacity
                                        onPress={() => toggleSidebar(false)}
                                        style={styles.closeBtnNew}
                                    >
                                        <Ionicons name="close" size={32} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView contentContainerStyle={styles.menuItemsNew}>
                                    {menuItems.map((item) => (
                                        <TouchableOpacity
                                            key={item.name}
                                            style={styles.menuItemNew}
                                            onPress={() => handleNav(item.screen)}
                                        >
                                            <Ionicons
                                                name={item.icon}
                                                size={26}
                                                color={colors.accentPrimary}
                                            />
                                            <Text style={styles.menuTextNew}>{item.name}</Text>
                                        </TouchableOpacity>
                                    ))}

                                    <View style={styles.dividerNew} />

                                    <TouchableOpacity
                                        style={styles.menuItemNew}
                                        onPress={handleLogout}
                                    >
                                        <Ionicons name="log-out-outline" size={26} color={colors.danger} />
                                        <Text style={[styles.menuTextNew, { color: colors.danger }]}>Log Out</Text>
                                    </TouchableOpacity>
                                </ScrollView>

                                <View style={[styles.sidebarFooter, { paddingBottom: spacing.xl }]}>
                                    <Text style={styles.versionText}>v1.1.0 • SynCloud Inc.</Text>
                                </View>
                            </SafeAreaView>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>

            {/* Notification Modal */}
            <Modal
                visible={notifVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setNotifVisible(false)}
                statusBarTranslucent={true}
            >
                <View
                    style={styles.notifOverlay}
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={() => setNotifVisible(false)}
                    />
                    <View style={[styles.notifContainer, { backgroundColor: colors.bgCard, padding: spacing.lg }]}>
                        <View style={[styles.notifHeader, { marginBottom: spacing.md }]}>
                            <View>
                                <Text style={[styles.notifTitle, { color: colors.textPrimary }]}>Notifications</Text>
                                <Text style={[styles.notifSubtitle, { color: colors.textDim }]}>{notifications.length} Unread</Text>
                            </View>
                            <View style={styles.headerRight}>
                                {notifications.length > 0 && (
                                    <TouchableOpacity onPress={clearNotifications} style={{ marginRight: 16 }}>
                                        <Text style={[styles.clearAllText, { color: colors.accentPrimary }]}>Clear All</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => setNotifVisible(false)} style={styles.notifClose}>
                                    <Ionicons name="close" size={24} color={colors.textMuted} />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <ScrollView
                            style={styles.notifList}
                            contentContainerStyle={styles.notifListContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {notifications.length === 0 ? (
                                <Text style={[styles.emptyNotif, { color: colors.textDim }]}>No notifications received</Text>
                            ) : (
                                notifications.map((n) => (
                                    <View key={n.id} style={styles.notifItemWrapper}>
                                        <View style={[styles.notifItemSolid, { backgroundColor: colors.bgCard2, borderColor: (n.color || colors.accentPrimary) + '40' }]}>
                                            <View style={[styles.notifIconBox, { backgroundColor: (n.color || colors.accentPrimary) + '20' }]}>
                                                <Ionicons name={n.icon || 'notifications-outline'} size={22} color={n.color || colors.accentPrimary} />
                                            </View>
                                            <View style={styles.notifContent}>
                                                <View style={styles.notifItemHeader}>
                                                    <Text style={[styles.notifItemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{n.title || 'Notification'}</Text>
                                                    <Text style={[styles.notifTime, { color: colors.textDim }]}>{formatTime(n.timestamp)}</Text>
                                                </View>
                                                <Text style={[styles.notifItemMsg, { color: colors.textMuted }]}>{n.message || '...'}</Text>

                                                {n.actions && (
                                                    <View style={styles.actionRow}>
                                                        {n.actions.map((act) => (
                                                            <TouchableOpacity
                                                                key={act.label}
                                                                style={[
                                                                    styles.actionButton,
                                                                    {
                                                                        borderColor: act.type === 'danger' ? colors.danger : n.color,
                                                                        backgroundColor: 'transparent'
                                                                    }
                                                                ]}
                                                                onPress={() => handleAction(n.id, act.label)}
                                                            >
                                                                <Text style={[
                                                                    styles.actionText,
                                                                    { color: act.type === 'danger' ? colors.danger : n.color }
                                                                ]}>
                                                                    {act.label}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Main Header UI */}
            <View style={styles.left}>
                <TouchableOpacity style={styles.menuBtn} onPress={() => toggleSidebar(true)}>
                    <Ionicons name="menu" size={28} color={colors.textPrimary} />
                </TouchableOpacity>
                <View>
                    <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>SynCloud</Text>
                    <Text style={[styles.brandSubtitle, { color: colors.accentPrimary }]}>Intelligent Multi-Cloud Backup</Text>
                </View>
            </View>
            <View style={styles.right}>
                <TouchableOpacity style={styles.notifBtn} onPress={() => setNotifVisible(true)}>
                    <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                    {notifications.length > 0 && (
                        <View style={[
                            styles.notifBadge,
                            {
                                backgroundColor: notifications.some(n => n.type === 'danger') ? colors.danger : colors.warning,
                                borderColor: colors.bgPrimary
                            }
                        ]}>
                            <Text style={styles.notifBadgeText}>{notifications.length}</Text>
                        </View>
                    )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.avatarWrap} onPress={() => navigation.navigate('Profile')}>
                    <View style={[styles.avatarRing, { borderColor: colors.accentPrimary }]}>
                        <View style={[styles.avatar, { backgroundColor: colors.accentPrimary }]}>
                            <Text style={styles.avatarText}>{userData.fullName?.charAt(0).toUpperCase() || 'U'}</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    left: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    menuBtn: { padding: 4 },
    brandTitle: { fontSize: 20, fontWeight: '700', lineHeight: 24 },
    brandSubtitle: { fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
    right: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    notifBtn: { position: 'relative', padding: 4 },
    notifBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    notifBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
    },
    avatarWrap: {},
    avatarRing: {
        width: 38,
        height: 38,
        borderRadius: 19,
        borderWidth: 1.5,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    // Sidebar New
    sidebarFullscreen: {
        flex: 1,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    sidebarHeaderNew: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sidebarTitleNew: {
        fontSize: 32,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    closeBtnNew: {
        padding: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
    },
    menuItemsNew: {
        gap: 8,
    },
    menuItemNew: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 4,
        gap: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    menuTextNew: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    dividerNew: {
        height: 1,
        backgroundColor: 'rgba(255,255,255,0.1)',
        marginVertical: 12,
        marginHorizontal: 8,
    },
    sidebarFooter: {
        marginTop: 'auto',
        alignItems: 'center',
    },
    versionText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 12,
        fontWeight: '500',
    },

    // Notifications
    notifOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    notifContainer: {
        width: '100%',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        minHeight: 400,
        maxHeight: '85%',
        paddingBottom: 30,
        shadowColor: '#000',
        elevation: 25,
    },
    notifHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    notifTitle: {
        fontSize: 22, fontWeight: '700',
    },
    notifSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearAllText: {
        fontSize: 13,
        fontWeight: '700',
    },
    notifClose: {
        padding: 4,
    },
    notifItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    notifTime: {
        fontSize: 10,
        fontWeight: '600',
    },
    notifList: {
        maxHeight: 500,
    },
    notifListContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    notifItemWrapper: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden',
    },
    notifItemSolid: {
        flexDirection: 'row',
        gap: 12,
        padding: 16,
        borderWidth: 1.5,
        borderRadius: 16,
        marginBottom: 8,
    },
    notifIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notifContent: {
        flex: 1,
    },
    notifItemTitle: {
        fontWeight: '700',
        marginBottom: 2,
    },
    notifItemMsg: {
        fontSize: 13,
        marginBottom: 8,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    actionButton: {
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    emptyNotif: {
        textAlign: 'center',
        paddingVertical: 40,
        fontSize: 14,
        fontWeight: '600',
    },
});
