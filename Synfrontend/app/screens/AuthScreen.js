import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import InputField from '../components/InputField';

export default function AuthScreen() {
    const navigation = useNavigation();
    const { colors, typography, spacing, userData, setUserData, isDark, addNotification } = useTheme();
    const [isLogin, setIsLogin] = useState(true);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
        dateOfBirth: ''
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    const validateField = (name, value) => {
        let errorMsg = '';
        switch (name) {
            case 'email':
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!value) errorMsg = 'Email is required';
                else if (!emailRegex.test(value)) errorMsg = 'Invalid email format';
                break;
            case 'password':
                if (!value) errorMsg = 'Password is required';
                else if (value.length < 8) errorMsg = 'Minimum 8 characters';
                else if (!/[A-Z]/.test(value)) errorMsg = 'Need at least one uppercase letter';
                else if (!/[0-9]/.test(value)) errorMsg = 'Need at least one number';
                else if (!/[!@#$%^&*(),.?":{}|<>]/.test(value)) errorMsg = 'Need at least one special character';
                break;
            case 'confirmPassword':
                if (value !== formData.password) errorMsg = 'Passwords do not match';
                break;
            case 'fullName':
                if (!value) errorMsg = 'Full name is required';
                break;
            case 'username':
                if (!value) errorMsg = 'Username is required';
                else if (value.length < 3) errorMsg = 'Too short';
                break;
            case 'dateOfBirth':
                if (!value) errorMsg = 'Date of birth is required';
                else if (!validateAge(value)) errorMsg = 'You must be 13+ years old';
                break;
        }
        setFieldErrors(prev => ({ ...prev, [name]: errorMsg }));
        return errorMsg === '';
    };

    const isFormValid = () => {
        if (isLogin) {
            return formData.email && formData.password && !fieldErrors.email && !fieldErrors.password;
        }
        return (
            formData.fullName &&
            formData.username &&
            formData.email &&
            formData.password &&
            formData.confirmPassword &&
            formData.dateOfBirth &&
            Object.values(fieldErrors).every(err => !err)
        );
    };

    const handleFieldChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
        validateField(name, value);
    };

    const onChangeDate = (event, selectedDate) => {
        const currentDate = selectedDate || new Date();
        setShowDatePicker(Platform.OS === 'ios'); // Keep open on iOS, close on Android

        if (event.type === 'set' || Platform.OS === 'web') {
            // Format to YYYY-MM-DD
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0');
            const day = String(currentDate.getDate()).padStart(2, '0');
            const formattedDate = `${year}-${month}-${day}`;

            setFormData(prev => ({ ...prev, dateOfBirth: formattedDate }));
        }
    };

    const validateAge = (dobString) => {
        if (!dobString) return false;
        const birthDate = new Date(dobString);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age >= 13;
    };

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
    const API_URL = `${API_BASE}/api/auth`;

    const handleAuth = async () => {
        // Final Validation
        if (!isFormValid()) {
            setError('Please correct errors before submitting');
            addNotification({
                type: 'danger',
                title: 'Validation Error',
                message: 'Please fill all fields correctly.',
                icon: 'alert-circle-outline',
                color: colors.danger
            }, 3000);
            return;
        }

        setLoading(true);
        setError('');

        try {
            const endpoint = isLogin ? `${API_URL}/login` : `${API_URL}/signup`;
            const payload = isLogin
                ? { email: formData.email.toLowerCase().trim(), password: formData.password }
                : {
                    fullName: formData.fullName,
                    username: formData.username.trim(),
                    email: formData.email.toLowerCase().trim(),
                    password: formData.password,
                    dateOfBirth: formData.dateOfBirth
                };

            const targetUrl = `${API_URL}/${isLogin ? 'login' : 'signup'}`;
            console.log('📡 Authenticating at:', targetUrl);
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const rawText = await response.text();
            console.log('🔍 Raw Auth Response:', rawText.substring(0, 200));

            let data;
            try {
                data = JSON.parse(rawText);
            } catch (e) {
                console.error('❌ Failed to parse Auth JSON:', e.message);
                throw new Error('Server returned invalid data format (HTML instead of JSON)');
            }

            if (!response.ok) {
                throw new Error(data.error || 'Authentication failed');
            }

            console.log('Auth success:', data);

            addNotification({
                type: 'success',
                title: isLogin ? 'Welcome Back' : 'Account Created',
                message: isLogin ? 'Successfully logged in.' : 'Your account has been created successfully!',
                icon: 'checkmark-circle-outline',
                color: colors.success
            }, 4000);

            // Inject dynamic user data into global state
            if (isLogin && data.user) {
                setUserData({
                    ...userData,
                    fullName: data.user.fullName || data.user.name,
                    username: data.user.username,
                    email: data.user.email,
                    isVerified: data.user.isVerified,
                    status: data.user.isVerified ? 'Verified' : 'Unverified',
                    passwordLastChanged: data.user.passwordLastChanged,
                    id: data.user.id,
                    defaultCloud: data.user.defaultCloud,
                    aesEncryptionEnabled: data.user.aesEncryptionEnabled,
                    createdAt: data.user.createdAt,
                    token: data.token
                });
                navigation.replace('Main');
            } else if (!isLogin && data.success) {
                // Navigate to OTP verification after signup
                navigation.navigate('Otp', { email: formData.email.toLowerCase().trim(), mode: 'verify' });
            }
        } catch (err) {
            if (err.message.includes('verify your email')) {
                navigation.navigate('Otp', { email: formData.email.toLowerCase().trim(), mode: 'verify' });
                return;
            }

            setError(err.message);
            addNotification({
                type: 'danger',
                title: 'Auth Failed',
                message: err.message,
                icon: 'close-circle-outline',
                color: colors.danger
            }, 5000);
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <View style={[styles.logoBox, { backgroundColor: colors.accentPrimary }]}>
                            <Ionicons name="cloud-outline" size={32} color="#fff" />
                        </View>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                            {isLogin ? 'Sign in to continue your secure backups' : 'Join SynCloud for intelligent cloud management'}
                        </Text>
                    </View>

                    {error ? (
                        <View style={[styles.errorBox, { backgroundColor: colors.danger + '20' }]}>
                            <Ionicons name="alert-circle-outline" size={20} color={colors.danger || '#FF4B4B'} />
                            <Text style={[styles.errorText, { color: colors.danger || '#FF4B4B' }]}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.form}>
                        {!isLogin && (
                            <>
                                <InputField
                                    key="signup-name"
                                    icon="person-outline"
                                    placeholder="Full Name"
                                    value={formData.fullName}
                                    onChangeText={(txt) => handleFieldChange('fullName', txt)}
                                    colors={colors}
                                    error={fieldErrors.fullName}
                                />
                                <InputField
                                    key="signup-user"
                                    icon="at-outline"
                                    placeholder="Username"
                                    value={formData.username}
                                    onChangeText={(txt) => handleFieldChange('username', txt)}
                                    colors={colors}
                                    error={fieldErrors.username}
                                />

                                {Platform.OS === 'web' ? (
                                    <View style={styles.inputWrapper}>
                                        <View style={[
                                            styles.inputContainer,
                                            {
                                                backgroundColor: colors.bgCard,
                                                borderColor: fieldErrors.dateOfBirth ? '#FF4B4B' : colors.bgCardBorder,
                                                marginBottom: 0 // Remove margin to avoid double spacing with wrapper
                                            }
                                        ]}>
                                            <Ionicons
                                                name="calendar-outline"
                                                size={20}
                                                color={fieldErrors.dateOfBirth ? '#FF4B4B' : colors.textDim}
                                                style={styles.inputIcon}
                                            />
                                            <input
                                                type="date"
                                                value={formData.dateOfBirth}
                                                onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                                                style={{
                                                    flex: 1,
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: colors.textPrimary,
                                                    fontSize: '16px',
                                                    fontFamily: 'inherit',
                                                    outline: 'none',
                                                    paddingTop: '12px',
                                                    paddingBottom: '12px'
                                                }}
                                            />
                                        </View>
                                        {fieldErrors.dateOfBirth ? <Text style={styles.fieldErrorText}>{fieldErrors.dateOfBirth}</Text> : null}
                                    </View>
                                ) : (
                                    <View style={styles.inputWrapper}>
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => setShowDatePicker(true)}
                                            style={[
                                                styles.inputContainer,
                                                {
                                                    backgroundColor: colors.bgCard,
                                                    borderColor: fieldErrors.dateOfBirth ? '#FF4B4B' : colors.bgCardBorder,
                                                    marginBottom: 0 // Remove margin to avoid double spacing with wrapper
                                                }
                                            ]}
                                        >
                                            <Ionicons
                                                name="calendar-outline"
                                                size={20}
                                                color={fieldErrors.dateOfBirth ? '#FF4B4B' : colors.textDim}
                                                style={styles.inputIcon}
                                            />
                                            <Text style={[
                                                styles.input,
                                                {
                                                    color: formData.dateOfBirth ? colors.textPrimary : colors.textDim,
                                                    textAlignVertical: 'center',
                                                    paddingVertical: 16
                                                }
                                            ]}>
                                                {formData.dateOfBirth || "Date of Birth"}
                                            </Text>
                                        </TouchableOpacity>
                                        {fieldErrors.dateOfBirth ? <Text style={styles.fieldErrorText}>{fieldErrors.dateOfBirth}</Text> : null}

                                        {showDatePicker && (
                                            <DateTimePicker
                                                value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date(2000, 0, 1)}
                                                mode="date"
                                                display="default"
                                                onChange={(e, d) => {
                                                    onChangeDate(e, d);
                                                    if (d) validateField('dateOfBirth', `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
                                                }}
                                                maximumDate={new Date()}
                                            />
                                        )}
                                    </View>
                                )}
                            </>
                        )}
                        <InputField
                            key="auth-email"
                            icon="mail-outline"
                            placeholder="Email Address"
                            value={formData.email}
                            onChangeText={(txt) => handleFieldChange('email', txt)}
                            colors={colors}
                            error={fieldErrors.email}
                        />
                        <InputField
                            key="auth-password"
                            icon="lock-closed-outline"
                            placeholder="Password"
                            value={formData.password}
                            onChangeText={(txt) => handleFieldChange('password', txt)}
                            isPassword={true}
                            showPassword={showPassword}
                            setShowPassword={setShowPassword}
                            colors={colors}
                            error={fieldErrors.password}
                        />
                        {!isLogin && (
                            <InputField
                                key="auth-confirm-password"
                                icon="lock-closed-outline"
                                placeholder="Confirm Password"
                                value={formData.confirmPassword}
                                onChangeText={(txt) => handleFieldChange('confirmPassword', txt)}
                                isPassword={true}
                                showPassword={showConfirmPassword}
                                setShowPassword={setShowConfirmPassword}
                                colors={colors}
                                error={fieldErrors.confirmPassword}
                            />
                        )}

                        {isLogin && (
                            <TouchableOpacity
                                style={styles.forgotPass}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={[styles.forgotText, { color: colors.accentPrimary }]}>Forgot Password?</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.authButton,
                                {
                                    backgroundColor: colors.accentPrimary,
                                    opacity: (loading || !isFormValid()) ? 0.6 : 1
                                }
                            ]}
                            onPress={handleAuth}
                            disabled={loading || !isFormValid()}
                        >
                            <Text style={styles.authButtonText}>
                                {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.dividerRow}>
                            <View style={[styles.divider, { backgroundColor: colors.bgCardBorder }]} />
                            <Text style={[styles.dividerText, { color: colors.textDim }]}>OR</Text>
                            <View style={[styles.divider, { backgroundColor: colors.bgCardBorder }]} />
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.googleButton, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                        <Ionicons name="logo-google" size={20} color="#EA4335" />
                        <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>
                            Continue with Google
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: colors.textMuted }]}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                        </Text>
                        <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
                            <Text style={[styles.linkText, { color: colors.accentPrimary }]}>
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    container: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBox: {
        width: 64,
        height: 64,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    form: {
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 58,
        borderRadius: 4,
        borderWidth: 1.5,
        marginBottom: 16, // Adjusted to 16
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
        paddingVertical: 12,
        paddingRight: 8,
        borderWidth: 0
    },
    eyeBtn: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    forgotPass: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotText: {
        fontSize: 14,
        fontWeight: '600',
    },
    authButton: {
        height: 58,
        borderRadius: 4,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    authButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        marginHorizontal: 16,
        fontSize: 12,
        fontWeight: '700',
    },
    googleButton: {
        flexDirection: 'row',
        height: 58,
        borderRadius: 4,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    googleButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 32, // Reduced from 40
    },
    footerText: {
        fontSize: 14,
    },
    linkText: {
        fontSize: 14,
        fontWeight: '700',
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 4,
        marginBottom: 16,
        gap: 10,
    },
    errorText: {
        fontSize: 14,
        fontWeight: '600',
    },
    inputWrapper: {
        marginBottom: 16, // Adjusted to 16
        width: '100%',
    },
    fieldErrorText: {
        color: '#FF4B4B',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        marginLeft: 4,
    },
});
