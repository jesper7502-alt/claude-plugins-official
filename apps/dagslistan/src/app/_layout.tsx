import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast } from '../components/Toast';
import { APP_MODE } from '../lib/config';
import { StoreProvider } from '../lib/store';
import { useColors } from '../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

function AppTabs() {
  const c = useColors();
  const checker = APP_MODE === 'checker';
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          headerStyle: { backgroundColor: c.bg },
          headerShadowVisible: false,
          headerTintColor: c.ink,
          headerTitleStyle: { fontWeight: '800' },
          tabBarActiveTintColor: c.accent,
          tabBarInactiveTintColor: c.muted,
          sceneStyle: { backgroundColor: c.bg },
          // Avbockningssidan har bara en vy och behöver ingen flikrad.
          tabBarStyle: checker ? { display: 'none' } : { backgroundColor: c.surface, borderTopColor: c.line },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Tasks', headerTitle: 'Dagslistan', tabBarIcon: icon('checkbox-outline') }} />
        <Tabs.Screen name="planering" options={{ title: 'Planering', headerShown: false, tabBarIcon: icon('calendar-outline'), href: checker ? null : undefined }} />
        <Tabs.Screen name="genomfort" options={{ title: 'Genomfört', headerShown: false, tabBarIcon: icon('time-outline'), href: checker ? null : undefined }} />
      </Tabs>
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <AppTabs />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
