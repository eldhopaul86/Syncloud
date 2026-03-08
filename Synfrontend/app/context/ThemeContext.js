import React, { createContext, useContext, useState, useEffect } from 'react';
import { Colors, ColorsLight, Radius, Spacing, Shadow, Typography } from '../theme';
import { StatusBar } from 'expo-status-bar';

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Default to Dark Mode
    const [isDark, setIsDark] = useState(true);

    const toggleTheme = () => {
        setIsDark(prev => !prev);
    };

    const [userData, setUserData] = useState({
        fullName: 'Eldho Paul',
        username: 'eldho',
        email: 'eldhopaul20401@gmail.com',
        id: '6998a6ba91ff144bcbcdd290',
        status: 'Verified',
        createdAt: '2025-04-01T04:45:00.000Z',
        agentToken: '153022c1-26e4-4c4d-b287-c14759254ecf',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5OThhNmJhOTFmZjE0NGJjYmNkZDI5MCIsImlhdCI6MTc3MTcwNjExNywiZXhwIjoxNzc0Mjk4MTE3fQ.m9-R4CELONXoOVtww7TA3qgGE9fGnF8PlAtsnlDOI58', // Set for authenticated testing
        aesEncryptionEnabled: false,
        defaultCloud: 'cloudinary'
    });

    const [viewCloudFilter, setViewCloudFilter] = useState('all');
    const [sessionAlertsProcessed, setSessionAlertsProcessed] = useState(false);

    const [notifications, setNotifications] = useState([]);

    const addNotification = (notif, duration = null) => {
        const id = Date.now();
        setNotifications(prev => {
            // Deduplication: Don't add if a notification with the same title exists
            if (notif.title && prev.some(n => n.title === notif.title)) {
                return prev;
            }
            const newNotif = {
                id,
                timestamp: id,
                ...notif
            };

            if (duration) {
                setTimeout(() => {
                    setNotifications(current => current.filter(n => n.id !== id));
                }, duration);
            }

            return [newNotif, ...prev];
        });
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    const updateUserSettings = async (updates) => {
        try {
            // Optimistic update
            const newUserData = { ...userData, ...updates };
            setUserData(newUserData);

            if (!userData.token) return;

            const API_BASE = (process.env.EXPO_PUBLIC_API_URL || 'https://alivia-unrayed-dewitt.ngrok-free.dev').replace(/\/$/, '');
            const response = await fetch(`${API_BASE}/api/user/settings`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userData.token}`
                },
                body: JSON.stringify(updates)
            });

            const data = await response.json();
            if (!data.success) {
                // Rollback or handle error
                console.error('Failed to sync settings with backend');
            }
        } catch (error) {
            console.error('Update settings failed:', error);
        }
    };

    const theme = {
        colors: isDark ? Colors : ColorsLight,
        radius: Radius,
        spacing: Spacing,
        shadow: Shadow,
        typography: Typography,
        isDark,
        toggleTheme,
        userData,
        setUserData, // Shared function to update user data
        updateUserSettings, // Shared function to update settings with backend sync
        notifications,
        setNotifications,
        addNotification,
        clearNotifications,
        viewCloudFilter,
        setViewCloudFilter,
        sessionAlertsProcessed,
        setSessionAlertsProcessed,
    };

    return (
        <ThemeContext.Provider value={theme}>
            <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={theme.colors.bgPrimary} />
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
