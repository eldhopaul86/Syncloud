import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function OnboardingScreen({ navigation }) {
    const { colors, isDark } = useTheme();

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={styles.gradient}
            />

            <SafeAreaView style={styles.container}>
                <View style={styles.content}>
                    <View style={[styles.imageContainer, { backgroundColor: isDark ? 'rgba(0, 200, 83, 0.1)' : 'rgba(0, 200, 83, 0.05)' }]}>
                        <Ionicons name="cloud-done" size={120} color={colors.accentPrimary} />
                        <View style={styles.pulseContainer}>
                            <View style={[styles.pulse, { backgroundColor: colors.accentPrimary, opacity: 0.2 }]} />
                        </View>
                    </View>

                    <View style={styles.textSection}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            SynCloud<Text style={{ color: colors.accentPrimary }}>.</Text>
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
                            Intelligent Multi-Cloud Backup
                        </Text>
                        <Text style={[styles.description, { color: colors.textMuted }]}>
                            Smart AI-driven content analysis, deduplication, and automated backups across all your cloud providers.
                        </Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: colors.accentPrimary }]}
                        onPress={() => navigation.navigate('Auth')}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.buttonText}>Get Started</Text>
                        <Ionicons name="arrow-forward" size={20} color="#fff" />
                    </TouchableOpacity>

                    <Text style={[styles.footerText, { color: colors.textDim }]}>
                        Secure. Private. Intelligent.
                    </Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60%',
    },
    container: {
        flex: 1,
        paddingHorizontal: 32,
        justifyContent: 'space-between',
        paddingBottom: 40,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 40,
    },
    imageContainer: {
        width: 240,
        height: 240,
        borderRadius: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 48,
        position: 'relative',
    },
    pulseContainer: {
        position: 'absolute',
        width: '120%',
        height: '120%',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: -1,
    },
    pulse: {
        width: '100%',
        height: '100%',
        borderRadius: 150,
    },
    textSection: {
        alignItems: 'center',
    },
    title: {
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1.5,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },
    description: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    footer: {
        alignItems: 'center',
        width: '100%',
    },
    button: {
        flexDirection: 'row',
        width: '100%',
        height: 58,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        marginBottom: 24,
        elevation: 8,
        shadowColor: '#00C853',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    buttonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
});
