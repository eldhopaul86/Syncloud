import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    TextInput,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';

const OTP_LENGTH = 6;

export default function OtpScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { colors, isDark, addNotification, setUserData } = useTheme();

    // email and mode ('verify' or 'reset') passed via params
    const { email, mode = 'verify' } = route.params || {};

    const [otp, setOtp] = useState(new Array(OTP_LENGTH).fill(''));
    const [loading, setLoading] = useState(false);
    const [timer, setTimer] = useState(60);
    const inputRefs = useRef([]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer(prev => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleChange = (text, index) => {
        const newOtp = [...otp];
        newOtp[index] = text;
        setOtp(newOtp);

        // Move to next input if text is entered
        if (text && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const handleVerify = async () => {
        const otpString = otp.join('');
        if (otpString.length !== OTP_LENGTH) {
            addNotification({
                type: 'warning',
                title: 'Invalid Code',
                message: 'Please enter the full 6-digit code.',
                icon: 'alert-circle-outline'
            }, 3000);
            return;
        }

        setLoading(true);
        try {
            const endpoint = mode === 'verify' ? '/api/auth/verify-email' : '/api/auth/verify-reset'; // Note: verify-reset is combined in reset-password usually, but we might need a separate check or just go to reset screen

            // For Reset mode, we might want to navigate to a NewPasswordScreen instead of verifying here
            if (mode === 'reset') {
                navigation.navigate('ResetPassword', { email, otp: otpString });
                return;
            }

            const response = await fetch(`${API_BASE}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, otp: otpString })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Verification failed');
            }

            addNotification({
                type: 'success',
                title: 'Verified Successfully',
                message: 'Your email has been verified.',
                icon: 'checkmark-circle-outline'
            }, 4000);

            if (data.token && data.user) {
                setUserData({
                    fullName: data.user.fullName,
                    username: data.user.username,
                    email: data.user.email,
                    isVerified: data.user.isVerified,
                    status: data.user.isVerified ? 'Verified' : 'Unverified',
                    passwordLastChanged: data.user.passwordLastChanged,
                    defaultCloud: data.user.defaultCloud,
                    aesEncryptionEnabled: data.user.aesEncryptionEnabled,
                    id: data.user.id,
                    token: data.token
                });
                navigation.replace('Main');
            } else {
                navigation.replace('Auth');
            }
        } catch (error) {
            addNotification({
                type: 'danger',
                title: 'Verification Failed',
                message: error.message,
                icon: 'close-circle-outline'
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (timer > 0) return;

        try {
            const response = await fetch(`${API_BASE}/api/auth/resend-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (response.ok) {
                setTimer(60);
                addNotification({
                    type: 'success',
                    title: 'OTP Resent',
                    message: 'A new code has been sent to your email.',
                    icon: 'mail-outline'
                }, 3000);
            }
        } catch (error) {
            console.error("Resend error:", error);
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
                            <Ionicons name="mail-open-outline" size={32} color={colors.accentPrimary} />
                        </View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Verify Code</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            We've sent a verification code to{"\n"}
                            <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{email}</Text>
                        </Text>
                    </View>

                    <View style={styles.otpContainer}>
                        {otp.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={ref => inputRefs.current[index] = ref}
                                style={[
                                    styles.otpInput,
                                    {
                                        backgroundColor: colors.bgCard,
                                        borderColor: digit ? colors.accentPrimary : colors.bgCardBorder,
                                        color: colors.textPrimary
                                    }
                                ]}
                                maxLength={1}
                                keyboardType="number-pad"
                                value={digit}
                                onChangeText={text => handleChange(text, index)}
                                onKeyPress={e => handleKeyPress(e, index)}
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        style={[styles.verifyButton, { backgroundColor: colors.accentPrimary, opacity: loading ? 0.7 : 1 }]}
                        onPress={handleVerify}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.verifyButtonText}>Verify & Continue</Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.resendContainer}>
                        <Text style={[styles.resendText, { color: colors.textMuted }]}>
                            Didn't receive code?{" "}
                        </Text>
                        <TouchableOpacity onPress={handleResend} disabled={timer > 0}>
                            <Text style={[
                                styles.resendLink,
                                { color: timer > 0 ? colors.textDim : colors.accentPrimary }
                            ]}>
                                {timer > 0 ? `Resend in ${timer}s` : "Resend Code"}
                            </Text>
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
        lineHeight: 22
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 40
    },
    otpInput: {
        width: '14%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '700'
    },
    verifyButton: {
        height: 58,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    verifyButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    },
    resendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    resendText: {
        fontSize: 14
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '700'
    }
});
