import React, { useState, useContext } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import InputField from '../components/InputField';

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const { colors, addNotification } = useTheme();

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const handleRequestReset = async () => {
        if (!email) {
            setError('Please enter your email address');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError('Please enter a valid email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'any'
                },
                body: JSON.stringify({ email: email.toLowerCase().trim() })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to request reset');
            }

            addNotification({
                type: 'success',
                title: 'Code Sent',
                message: 'A password reset code has been sent to your email.',
                icon: 'mail-outline'
            }, 5000);

            // Navigate to OtpScreen in reset mode
            navigation.navigate('Otp', { email, mode: 'reset' });
        } catch (error) {
            addNotification({
                type: 'danger',
                title: 'Request Failed',
                message: error.message,
                icon: 'close-circle-outline'
            }, 5000);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.container}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>

                    <View style={styles.header}>
                        <View style={[styles.iconBox, { backgroundColor: colors.accentPrimary + '20' }]}>
                            <Ionicons name="lock-open-outline" size={32} color={colors.accentPrimary} />
                        </View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Forgot Password?</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Enter your email address and we'll send you a 6-digit code to reset your password.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <InputField
                            icon="mail-outline"
                            placeholder="Email Address"
                            value={email}
                            onChangeText={setEmail}
                            colors={colors}
                            error={error}
                            keyboardType="email-address"
                        />

                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: colors.accentPrimary, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleRequestReset}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resetButtonText}>Send Reset Code</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 20
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 30
    },
    header: {
        alignItems: 'center',
        marginBottom: 40
    },
    iconBox: {
        width: 70,
        height: 70,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        marginBottom: 10
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10
    },
    form: {
        flex: 1
    },
    inputWrapper: {
        marginBottom: 24
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 58,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 16
    },
    inputIcon: {
        marginRight: 12
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500'
    },
    errorText: {
        color: '#FF4B4B',
        fontSize: 12,
        marginTop: 6,
        marginLeft: 4,
        fontWeight: '600'
    },
    resetButton: {
        height: 58,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    resetButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    }
});
