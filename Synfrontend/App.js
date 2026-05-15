import * as React from 'react'; // Force reload
import { useEffect, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './app/screens/HomeScreen';
import FilesScreen from './app/screens/FilesScreen';
import CloudScreen from './app/screens/CloudScreen';
import ProfileScreen from './app/screens/ProfileScreen';
import OnboardingScreen from './app/screens/OnboardingScreen';
import AuthScreen from './app/screens/AuthScreen';
import PromptSearchScreen from './app/screens/PromptSearchScreen';
import OtpScreen from './app/screens/OtpScreen';
import ForgotPasswordScreen from './app/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './app/screens/ResetPasswordScreen';
import ChangePasswordScreen from './app/screens/ChangePasswordScreen';

import { ThemeProvider, useTheme } from './app/context/ThemeContext';
import { startAutoBackupService, stopAutoBackupService, confirmPendingBackup } from './app/utils/BackupService';
import NotificationAlerts from './app/components/NotificationAlerts';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.bgCard,
          borderTopWidth: 0,
          height: 100,
          paddingBottom: 40,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          elevation: 25,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
        },
        tabBarActiveTintColor: colors.accentPrimary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: -4,
          marginBottom: 4
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          const iconSize = 24;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Files') {
            iconName = focused ? 'folder' : 'folder-outline';
          } else if (route.name === 'Cloud') {
            iconName = focused ? 'cloud-upload' : 'cloud-upload-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={iconSize} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Files" component={FilesScreen} />
      <Tab.Screen name="Cloud" component={CloudScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}



// 1. Configure Notification Categories
Notifications.setNotificationCategoryAsync('BACKUP_CONFIRMATION', [
  {
    identifier: 'ACCEPT',
    buttonTitle: '✅ Accept & Backup',
    options: { opensAppToForeground: true },
  },
  {
    identifier: 'REJECT',
    buttonTitle: '❌ Reject',
    options: { opensAppToForeground: true },
  },
]);

// 2. Set default handler behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function AppContent() {
  const { colors, userData, notifications, addNotification, removeNotification } = useTheme();

  const lastBackupConfig = React.useRef(null);

  useEffect(() => {
    const initBackup = async () => {
      const currentConfig = `${userData?.autoBackupEnabled}-${userData?.autoBackupInterval}-${userData?.defaultCloud}-${userData?.aesEncryptionEnabled}-${userData?.ownershipVerificationEnabled}-${userData?.token ? 'T' : 'N'}`;

      if (lastBackupConfig.current === currentConfig) return;
      lastBackupConfig.current = currentConfig;

      console.log('🔄 Backup Configuration Changed:', currentConfig);

      // 2. Request permissions
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        console.log('🔔 Notification Permission Status:', status);
      } catch (err) {
        console.warn('⚠️ Notification permission request failed:', err);
      }

      // 3. Sync userData to AsyncStorage for background task access
      if (userData?.token) {
        await AsyncStorage.setItem('user_settings', JSON.stringify(userData));
        await startAutoBackupService(userData);
      } else {
        await stopAutoBackupService();
      }
    };

    initBackup();
  }, [userData?.autoBackupEnabled, userData?.autoBackupInterval, userData?.defaultCloud, userData?.aesEncryptionEnabled, userData?.ownershipVerificationEnabled, userData?.token]);

  // 4. Notification Listeners
  useEffect(() => {
    // Listener for when a notification is RECEIVED while the app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      const { title, body } = notification.request.content;
      
      let type = 'info';
      let icon = 'notifications-outline';
      let color = colors.accentPrimary;
      let persist = false;

      if (title.includes('Ignored') || title.includes('skipped')) {
        type = 'warning';
        icon = 'close-circle-outline';
        color = colors.warning;
      } else if (title.includes('Required')) {
        type = 'danger';
        icon = 'help-circle-outline';
        color = colors.danger;
      } else if (title.includes('Ownership')) {
        type = 'danger';
        icon = 'shield-alert-outline';
        color = colors.danger;
      } else if (title.includes('Success') || title.includes('Backed up') || title.includes('Confirmed')) {
        type = 'success';
        icon = 'checkmark-circle-outline';
        color = colors.success || '#4CAF50';
      } else if (title.includes('Deduplicated')) {
        type = 'info';
        icon = 'copy-outline';
        color = '#2196F3'; // Blue for info/deduplication
      } else if (title.includes('Threat') || title.includes('Malicious')) {
        type = 'danger';
        icon = 'alert-circle-outline';
        color = colors.danger;
      } else if (title.includes('Scan Started')) {
        type = 'info';
        icon = 'search-outline';
        color = colors.accentPrimary;
      } else if (title.includes('Scan Complete')) {
        type = 'success';
        icon = 'shield-outline';
        color = colors.success || '#4CAF50';
      }

      // 🚨 FEATURE: Hide popups for Auto Scan/Backup notifications to reduce noise, 
      // but keep them in the history (modal)
      const isAutoScan = title.includes('Auto Scan') || title.includes('Auto Backup') || title.includes('Backup Ignored') || title.includes('Backup Confirmed') || title.includes('Version Updated');
      const isProgress = title.includes('Scanning') || title.includes('Checking');

      const actions = [];
      if (title.includes('Required')) {
        actions.push({ label: 'Accept', type: 'success' });
        actions.push({ label: 'Reject', type: 'danger' });
      }

      addNotification({
        type: type,
        title: title,
        message: body,
        icon,
        color,
        actions,
        data: notification.request.content.data,
        popupVisible: !(isAutoScan || isProgress)
      }, persist ? null : 2000);
    });

    // Listener for when a user CLICKS/RESPONDS to a notification
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(async (response) => {
      const { actionIdentifier, notification } = response;
      const { file, userData: fileUserData } = notification.request.content.data || {};

      // 1. Immediately dismiss from OS tray
      await Notifications.dismissNotificationAsync(notification.request.identifier);

      // 2. Immediately remove from internal state (History Modal)
      const targetNotif = (notifications || []).find(n => 
        n.title === notification.request.content.title && 
        n.message === notification.request.content.body
      );
      if (targetNotif) {
        removeNotification(targetNotif.id);
      }

      if (actionIdentifier === 'ACCEPT' && file) {
        console.log('User accepted backup from notification');
        confirmPendingBackup(file, userData || fileUserData, true);
      } else if (actionIdentifier === 'REJECT' && file) {
        console.log('User rejected backup from notification');
        confirmPendingBackup(file, userData || fileUserData, false);
      }
    });

    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }, [colors.accentPrimary, notifications, userData]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPrimary }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Otp" component={OtpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PromptSearch" component={PromptSearchScreen} />
          </Stack.Navigator>
          <NotificationAlerts />
        </NavigationContainer>
      </SafeAreaProvider>
    </View>
  );
}

export default function App() {
  try {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </GestureHandlerRootView>
    );
  } catch (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <Text style={{ color: '#fff', fontSize: 18 }}>Fatal App Error</Text>
        <Text style={{ color: '#ff4444', marginTop: 10 }}>{error.message}</Text>
      </View>
    );
  }
}


