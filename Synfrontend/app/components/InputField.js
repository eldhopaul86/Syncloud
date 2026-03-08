import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InputField = ({
    icon,
    placeholder,
    value,
    onChangeText,
    isPassword = false,
    showPassword,
    setShowPassword,
    colors,
    error,
    keyboardType = 'default',
    autoCapitalize = 'none'
}) => {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.inputWrapper}>
            <View style={[
                styles.inputContainer,
                {
                    backgroundColor: colors.bgCard,
                    borderColor: error ? '#FF4B4B' : (isFocused ? '#FFF' : colors.bgCardBorder)
                }
            ]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={error ? '#FF4B4B' : (isFocused ? '#FFF' : colors.textDim)}
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
                    secureTextEntry={isPassword && !showPassword}
                    autoCapitalize={autoCapitalize}
                    keyboardType={keyboardType}
                    selectionColor={colors.textPrimary}
                    underlineColorAndroid="transparent"
                    autoCorrect={false}
                    spellCheck={false}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                />
                {isPassword && (
                    <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={styles.eyeBtn}
                    >
                        <Ionicons
                            name={showPassword ? "eye-off-outline" : "eye-outline"}
                            size={20}
                            color={isFocused ? '#FFF' : colors.textDim}
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error ? <Text style={styles.fieldErrorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    inputWrapper: {
        marginBottom: 16,
        width: '100%',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 58,
        borderRadius: 4,
        borderWidth: 1.5,
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
    },
    eyeBtn: {
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fieldErrorText: {
        color: '#FF4B4B',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 4,
        marginLeft: 4,
    },
});

export default InputField;
