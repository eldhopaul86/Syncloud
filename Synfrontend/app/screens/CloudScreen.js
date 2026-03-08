import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';

const providers = [
    { id: 'Cloudinary', icon: 'cloud-upload-outline' },
    { id: 'Dropbox', icon: 'logo-dropbox' },
    { id: 'Mega', icon: 'cloud-outline' },
    { id: 'Google Drive', icon: 'logo-google' }
];

const InputField = ({ icon, label, placeholder, value, onChangeText, isPassword = false, showPasswords, setShowPasswords, colors }) => {
    const [isFocused, setIsFocused] = useState(false);
    return (
        <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{label}</Text>
            <View style={[
                styles.inputContainer,
                { borderColor: isFocused ? '#FFF' : colors.bgCardBorder }
            ]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={isFocused ? '#FFF' : colors.textDim}
                    style={styles.inputIcon}
                />
                <TextInput
                    style={[
                        styles.input,
                        { color: colors.textPrimary },
                        Platform.OS === 'web' ? { outlineStyle: 'none' } : null
                    ]}
                    placeholder={placeholder}
                    placeholderTextColor={colors.textDim}
                    value={value}
                    onChangeText={onChangeText}
                    secureTextEntry={isPassword && !showPasswords}
                    autoCapitalize="none"
                    autoCorrect={false}
                    spellCheck={false}
                    underlineColorAndroid="transparent"
                    selectionColor={colors.textPrimary}
                    autoComplete={Platform.OS === 'web' ? "one-time-code" : "off"}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {isPassword && (
                    <TouchableOpacity
                        style={styles.eyeBtn}
                        onPress={() => setShowPasswords(!showPasswords)}
                    >
                        <Ionicons
                            name={showPasswords ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={isFocused ? '#FFF' : colors.textDim}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
};

export default function CloudSetupScreen() {
    const { colors, spacing, radius, shadow, isDark, userData, updateUserSettings, addNotification } = useTheme();
    const [activeProvider, setActiveProvider] = useState('Cloudinary');
    const [showDefaultPicker, setShowDefaultPicker] = useState(false);
    const [showPasswords, setShowPasswords] = useState(false);
    const [connectedClouds, setConnectedClouds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState({ type: '', message: '' });

    useEffect(() => {
        fetchConnectedClouds();
    }, []);

    const fetchConnectedClouds = async () => {
        try {
            const token = userData?.token;
            if (!token) return;
            const response = await fetch(`${API_BASE}/api/cloud/credentials`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await response.json();
            if (data.success) {
                setConnectedClouds(data.connections.map(c => c.cloudName.toLowerCase()));
            }
        } catch (err) {
            console.error('Failed to fetch connected clouds:', err);
        }
    };

    const toggleDefault = (providerId) => {
        const cloudName = providerId.toLowerCase().replace(' ', '');
        updateUserSettings({ defaultCloud: cloudName });
        setShowDefaultPicker(false);
    };

    const defaultStorageLabel = providers.find(p => p.id.toLowerCase().replace(' ', '') === userData.defaultCloud)?.id || 'Cloudinary';

    const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
    const API_URL = `${API_BASE}/api/cloud`;

    const [formValues, setFormValues] = useState({
        cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
        mega: { email: '', password: '' },
        dropbox: { accessToken: '' },
        googledrive: { clientId: '', clientSecret: '', redirectUri: '', refreshToken: '' }
    });

    const handleSave = async () => {
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const providerKey = activeProvider.toLowerCase().replace(' ', '');
            const credentials = formValues[providerKey];
            const token = userData?.token;

            if (!token) throw new Error("Please log in again. Session expired.");

            const response = await fetch(`${API_URL}/credentials`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cloudName: activeProvider.toLowerCase().replace(' ', ''), // Aligned with backend model
                    credentials
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save');

            setStatus({ type: 'success', message: 'Credentials saved successfully!' });
            addNotification({
                type: 'success',
                title: 'Cloud Integrated',
                message: `Successfully connected and saved ${activeProvider} credentials.`,
                icon: 'cloud-done-outline',
                color: colors.accentPrimary
            });
            fetchConnectedClouds(); // Refresh connections
            handleClear(); // Automatically clear form as requested
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const updateValue = (provider, field, value) => {
        setFormValues(prev => ({
            ...prev,
            [provider]: { ...prev[provider], [field]: value }
        }));
    };

    const handleTest = async () => {
        setLoading(true);
        setStatus({ type: '', message: '' });

        try {
            const providerKey = activeProvider.toLowerCase().replace(' ', '');
            const credentials = formValues[providerKey];
            const token = userData?.token;

            if (!token) throw new Error("Please log in again. Session expired.");

            const response = await fetch(`${API_URL}/credentials/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cloudName: activeProvider.toLowerCase().replace(' ', ''),
                    credentials
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Validation failed');

            setStatus({ type: 'success', message: 'Credentials are valid! Connection successful.' });
            addNotification({
                type: 'success',
                title: 'Connection Validated',
                message: `${activeProvider} credentials verified successfully.`,
                icon: 'checkmark-circle-outline',
                color: colors.accentPrimary
            });
        } catch (err) {
            setStatus({ type: 'error', message: err.message });
        } finally {
            setLoading(false);
        }
    };

    const handleClear = () => {
        const providerKey = activeProvider.toLowerCase().replace(' ', '');
        const emptyValues = { ...formValues[providerKey] };
        Object.keys(emptyValues).forEach(key => emptyValues[key] = '');

        setFormValues(prev => ({
            ...prev,
            [providerKey]: emptyValues
        }));
        setStatus({ type: '', message: '' });
    };

    const renderForm = () => {
        switch (activeProvider) {
            case 'Cloudinary':
                return (
                    <View style={styles.form}>
                        <InputField
                            icon="cloud-outline"
                            label="Cloud Name"
                            placeholder="dlgdmu6gq"
                            value={formValues.cloudinary.cloudName}
                            onChangeText={(v) => updateValue('cloudinary', 'cloudName', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="key-outline"
                            label="API Key"
                            placeholder="884453123364144"
                            value={formValues.cloudinary.apiKey}
                            onChangeText={(v) => updateValue('cloudinary', 'apiKey', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="lock-closed-outline"
                            label="API Secret"
                            placeholder="••••••••••••••••"
                            value={formValues.cloudinary.apiSecret}
                            onChangeText={(v) => updateValue('cloudinary', 'apiSecret', v)}
                            isPassword={true}
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            colors={colors}
                        />
                    </View>
                );
            case 'Mega':
                return (
                    <View style={styles.form}>
                        <InputField
                            icon="mail-outline"
                            label="Mega Email"
                            placeholder="user@mega.nz"
                            value={formValues.mega.email}
                            onChangeText={(v) => updateValue('mega', 'email', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="lock-closed-outline"
                            label="Mega Password"
                            placeholder="••••••••"
                            value={formValues.mega.password}
                            onChangeText={(v) => updateValue('mega', 'password', v)}
                            isPassword={true}
                            showPasswords={showPasswords}
                            setShowPasswords={setShowPasswords}
                            colors={colors}
                        />
                    </View>
                );
            case 'Dropbox':
                return (
                    <View style={styles.form}>
                        <InputField
                            icon="key-outline"
                            label="Dropbox Access Token"
                            placeholder="dbx_••••••••"
                            value={formValues.dropbox.accessToken}
                            onChangeText={(v) => updateValue('dropbox', 'accessToken', v)}
                            colors={colors}
                        />
                    </View>
                );
            case 'Google Drive':
                return (
                    <View style={styles.form}>
                        <InputField
                            icon="id-card-outline"
                            label="Client ID"
                            placeholder="your_client_id"
                            value={formValues.googledrive.clientId}
                            onChangeText={(v) => updateValue('googledrive', 'clientId', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="lock-closed-outline"
                            label="Client Secret"
                            placeholder="your_client_secret"
                            value={formValues.googledrive.clientSecret}
                            onChangeText={(v) => updateValue('googledrive', 'clientSecret', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="link-outline"
                            label="Redirect URI"
                            placeholder="http://localhost"
                            value={formValues.googledrive.redirectUri}
                            onChangeText={(v) => updateValue('googledrive', 'redirectUri', v)}
                            colors={colors}
                        />
                        <InputField
                            icon="refresh-outline"
                            label="Refresh Token"
                            placeholder="your_refresh_token"
                            value={formValues.googledrive.refreshToken}
                            onChangeText={(v) => updateValue('googledrive', 'refreshToken', v)}
                            colors={colors}
                        />
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <View style={[styles.root, { backgroundColor: colors.bgPrimary }]}>
            <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

            <LinearGradient
                colors={isDark ? ['#00331A', colors.bgPrimary] : ['#E8F5E9', colors.bgPrimary]}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '40%' }}
            />


            <SafeAreaView style={styles.safeArea} edges={['top']}>
                <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>Cloud Storage Setup</Text>
                    </View>

                    {/* Default Storage Header */}
                    <View style={[styles.defaultCard, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                        <View style={styles.defaultRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.defaultLabel, { color: colors.textPrimary }]}>Default Storage</Text>
                                <Text style={[styles.defaultSub, { color: colors.textMuted }]}>Select your preferred cloud storage platform for uploads</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setShowDefaultPicker(!showDefaultPicker)}
                                style={[styles.picker, { backgroundColor: colors.bgCard2, borderColor: colors.bgCardBorder }]}
                            >
                                <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>{defaultStorageLabel}</Text>
                                <Ionicons name={showDefaultPicker ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
                            </TouchableOpacity>
                        </View>

                        {showDefaultPicker && (
                            <View style={[styles.pickerDropdown, { borderColor: colors.bgCardBorder, backgroundColor: colors.bgCard2 }]}>
                                {providers.map(p => {
                                    const providerKey = p.id.toLowerCase().replace(' ', '');
                                    const isDefault = userData.defaultCloud === providerKey;
                                    return (
                                        <TouchableOpacity
                                            key={p.id}
                                            onPress={() => toggleDefault(p.id)}
                                            style={[styles.pickerItem, isDefault && { backgroundColor: colors.accentPrimary + '15' }]}
                                        >
                                            <Text style={[styles.pickerItemText, { color: isDefault ? colors.accentPrimary : colors.textPrimary }]}>
                                                {p.id}
                                            </Text>
                                            {isDefault && <Ionicons name="checkmark" size={16} color={colors.accentPrimary} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        )}
                    </View>

                    {/* Provider Selection */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBarContainer}>
                        <View style={styles.tabBar}>
                            {providers.map(p => {
                                const active = activeProvider === p.id;
                                const isDefault = userData.defaultCloud === p.id.toLowerCase().replace(' ', '');
                                return (
                                    <TouchableOpacity
                                        key={p.id}
                                        onPress={() => setActiveProvider(p.id)}
                                        style={[styles.tabItem, active && { borderBottomColor: colors.accentPrimary, borderBottomWidth: 2 }]}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Ionicons name={p.icon} size={18} color={active ? colors.accentPrimary : colors.textMuted} />
                                            <Text style={[styles.tabText, { color: active ? colors.textPrimary : colors.textMuted }]}>{p.id}</Text>
                                            {isDefault && (
                                                <View style={[styles.defaultBadge, { backgroundColor: colors.accentSecondary }]}>
                                                    <Text style={styles.badgeText}>Default</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Integration Form */}
                    <View style={[styles.integrationCard, { backgroundColor: colors.bgCard, borderColor: colors.bgCardBorder }]}>
                        <View style={styles.integrationHeader}>
                            <View style={[styles.iconBox, { backgroundColor: colors.bgCard2 }]}>
                                <Ionicons name="cloud-upload-outline" size={24} color={colors.textPrimary} />
                            </View>
                            <View>
                                <Text style={[styles.integrationTitle, { color: colors.textPrimary }]}>{activeProvider} Integration</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                                    <View style={[styles.statusDot, { backgroundColor: connectedClouds.includes(activeProvider.toLowerCase().replace(' ', '')) ? colors.success : colors.danger }]} />
                                    <Text style={[styles.integrationSub, { color: colors.textMuted }]}>
                                        {connectedClouds.includes(activeProvider.toLowerCase().replace(' ', ''))
                                            ? 'Connection active and secure'
                                            : 'No connection set up'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {status.message ? (
                            <View style={[styles.statusBox, { backgroundColor: status.type === 'error' ? colors.danger + '20' : colors.accentPrimary + '20' }]}>
                                <Text style={{ color: status.type === 'error' ? colors.danger : colors.accentPrimary, fontSize: 13, fontWeight: '600' }}>
                                    {status.message}
                                </Text>
                            </View>
                        ) : null}

                        {renderForm()}

                        {/* Footer Actions */}
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={[styles.btnAction, { backgroundColor: colors.danger + '20' }]}
                                onPress={handleClear}
                            >
                                <Text style={{ color: colors.danger, fontWeight: '700' }}>Clear Credentials</Text>
                            </TouchableOpacity>
                            <View style={styles.footerRow}>
                                <TouchableOpacity
                                    style={[styles.btnAction, { backgroundColor: colors.bgCard2, flex: 1, opacity: loading ? 0.7 : 1 }]}
                                    onPress={handleTest}
                                    disabled={loading}
                                >
                                    <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>
                                        {loading ? '...' : 'Test'}
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.btnAction, { backgroundColor: colors.textPrimary, flex: 1.5, opacity: loading ? 0.7 : 1 }]}
                                    onPress={handleSave}
                                    disabled={loading}
                                >
                                    <Text style={{ color: '#000', fontWeight: '700' }}>
                                        {loading ? 'Saving...' : 'Save'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    safeArea: { flex: 1 },
    container: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 100 },
    header: { alignItems: 'flex-start', marginBottom: 32 },
    title: { fontSize: 24, fontWeight: '800', marginBottom: 8 },

    defaultCard: { padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 24 },
    defaultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
    defaultLabel: { fontSize: 16, fontWeight: '700' },
    defaultSub: { fontSize: 11, marginTop: 4, flexShrink: 1 },
    picker: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 4, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 100, justifyContent: 'space-between' },

    tabBarContainer: { marginBottom: 24 },
    tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    tabItem: { paddingBottom: 10, marginRight: 24 },
    tabText: { fontSize: 14, fontWeight: '700' },
    defaultBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 },
    badgeText: { fontSize: 9, color: '#FFF', fontWeight: '800' },

    integrationCard: { padding: 24, borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
    integrationHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 28, flexWrap: 'wrap' },
    iconBox: { width: 52, height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    integrationTitle: { fontSize: 18, fontWeight: '800', flexShrink: 1 },
    integrationSub: { fontSize: 12, marginTop: 4, opacity: 0.7, lineHeight: 18, flexShrink: 1 },

    form: { gap: 20 },
    fieldContainer: { gap: 8 },
    fieldLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 4,
        paddingHorizontal: 16,
        height: 56,
        backgroundColor: 'transparent'
    },
    inputIcon: { marginRight: 12 },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: 12,
        borderWidth: 0
    },
    eyeBtn: { padding: 8, justifyContent: 'center', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4 },

    footer: { flexDirection: 'column', marginTop: 32, gap: 14 },
    btnAction: { height: 52, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
    footerRow: { flexDirection: 'row', gap: 12 },

    pickerDropdown: { marginTop: 12, borderTopWidth: 1, paddingTop: 4 },
    pickerItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 4 },
    pickerItemText: { fontSize: 15, fontWeight: '600' },
    statusBox: {
        padding: 16,
        borderRadius: 4,
        marginBottom: 20,
        alignItems: 'center',
    },
});
