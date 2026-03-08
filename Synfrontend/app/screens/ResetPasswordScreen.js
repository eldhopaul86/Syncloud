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
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import InputField from '../components/InputField';

export default function ResetPasswordScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const { colors, addNotification } = useTheme();

    const { email, otp } = route.params || {};

    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState({});

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const validate = () => {
        let errors = {};
        if (newPassword.length < 8) errors.password = 'Min 8 characters required';
        else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/.test(newPassword)) errors.password = 'Must include uppercase and numbers';

        if (newPassword !== confirmPassword) errors.confirm = 'Passwords do not match';

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleReset = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'any'
                },
                body: JSON.stringify({ email, otp, newPassword })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Reset failed');
            }

            addNotification({
                type: 'success',
                title: 'Password Reset',
                message: 'Your password has been updated successfully.',
                icon: 'checkmark-circle-outline'
            }, 5000);

            navigation.navigate('Auth');
        } catch (error) {
            addNotification({
                type: 'danger',
                title: 'Reset Failed',
                message: error.message,
                icon: 'close-circle-outline'
            }, 5000);
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
                            <Ionicons name="shield-checkmark-outline" size={32} color={colors.accentPrimary} />
                        </View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>New Password</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Set a secure password for your SynCloud account.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <InputField
                            icon="lock-closed-outline"
                            placeholder="New Password"
                            isPassword={true}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            colors={colors}
                            error={fieldErrors.password}
                        />

                        <InputField
                            icon="lock-closed-outline"
                            placeholder="Confirm New Password"
                            isPassword={true}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            colors={colors}
                            error={fieldErrors.confirm}
                        />

                        <TouchableOpacity
                            style={[styles.resetButton, { backgroundColor: colors.accentPrimary, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleReset}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.resetButtonText}>Reset Password</Text>
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
        lineHeight: 22
    },
    form: {
        flex: 1
    },
    inputWrapper: {
        marginBottom: 16
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 58,
        borderRadius: 12,
        borderWidth: 1.5,
        paddingHorizontal: 16,
        marginBottom: 4
    },
    inputIcon: {
        marginRight: 12
    },
    errorText: {
        color: '#FF4B4B',
        fontSize: 12,
        marginLeft: 4,
        fontWeight: '600'
    },
    resetButton: {
        height: 58,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 20,
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
