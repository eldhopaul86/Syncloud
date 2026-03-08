import React, { useState } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import InputField from '../components/InputField';

export default function ChangePasswordScreen() {
    const navigation = useNavigation();
    const { colors, userData, setUserData, addNotification } = useTheme();

    const [passwordData, setPasswordData] = useState({ current: '', new: '', confirm: '' });
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');

    const handleUpdate = async () => {
        if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
            addNotification({ type: 'warning', title: 'Required', message: 'All fields are required.' }, 3000);
            return;
        }
        if (passwordData.new !== passwordData.confirm) {
            addNotification({ type: 'warning', title: 'Mismatch', message: 'New passwords do not match.' }, 3000);
            return;
        }
        if (passwordData.new.length < 8) {
            addNotification({ type: 'warning', title: 'Weak Password', message: 'Min 8 characters required.' }, 3000);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`,
                    'ngrok-skip-browser-warning': 'any'
                },
                body: JSON.stringify({
                    currentPassword: passwordData.current,
                    newPassword: passwordData.new
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Update failed');

            addNotification({
                type: 'success',
                title: 'Password Updated',
                message: 'Your password has been changed successfully.',
                icon: 'checkmark-circle-outline'
            }, 3000);

            // Update local state with new timestamp
            if (data.passwordLastChanged) {
                setUserData({ ...userData, passwordLastChanged: data.passwordLastChanged });
            }

            navigation.goBack();
        } catch (error) {
            addNotification({ type: 'danger', title: 'Update Failed', message: error.message }, 5000);
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
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
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
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Security Setting</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            Update your password regularly to keep your account secure.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputLabelRow}>
                            <Text style={[styles.inputLabel, { color: colors.textDim }]}>CURRENT PASSWORD</Text>
                            <TouchableOpacity onPress={() => {
                                addNotification({
                                    type: 'info',
                                    title: 'Password Reset',
                                    message: 'Please log out and use "Forgot Password" on the login screen.',
                                    icon: 'information-circle-outline'
                                }, 6000);
                            }}>
                                <Text style={{ color: colors.accentPrimary, fontSize: 12, fontWeight: '600' }}>Forgot?</Text>
                            </TouchableOpacity>
                        </View>
                        <InputField
                            icon="lock-closed-outline"
                            placeholder="Enter current password"
                            isPassword
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            value={passwordData.current}
                            onChangeText={(t) => setPasswordData({ ...passwordData, current: t })}
                            colors={colors}
                        />

                        <Text style={[styles.inputLabel, { color: colors.textDim, marginTop: 10 }]}>NEW PASSWORD</Text>
                        <InputField
                            icon="lock-open-outline"
                            placeholder="Enter new password"
                            isPassword
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            value={passwordData.new}
                            onChangeText={(t) => setPasswordData({ ...passwordData, new: t })}
                            colors={colors}
                        />

                        <Text style={[styles.inputLabel, { color: colors.textDim, marginTop: 10 }]}>CONFIRM NEW PASSWORD</Text>
                        <InputField
                            icon="key-outline"
                            placeholder="Repeat new password"
                            isPassword
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            value={passwordData.confirm}
                            onChangeText={(t) => setPasswordData({ ...passwordData, confirm: t })}
                            colors={colors}
                        />

                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: colors.accentPrimary, opacity: loading ? 0.7 : 1 }]}
                            onPress={handleUpdate}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={[colors.accentPrimary, colors.accentPrimary + 'CC']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Update Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    header: {
        alignItems: 'center',
        marginBottom: 20
    },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 26,
        fontWeight: '900',
        marginBottom: 8
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22
    },
    form: {
        gap: 6
    },
    inputLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4
    },
    actionButton: {
        height: 58,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800'
    },
    tipBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 40,
        padding: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.02)'
    },
    tipText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18
    }
});
