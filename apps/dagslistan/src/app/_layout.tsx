import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Text, View, type ColorValue } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Login, NoAccess } from '../components/Login';
import { Toast } from '../components/Toast';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;
const icon = (name: IconName) =>
  function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Ionicons name={name} color={color as string} size={size} />;
  };

function SignOutButton() {
  const s = useStore();
  const c = useColors();
  return (
    <Pressable onPress={() => void s.signOut()} accessibilityRole="button" hitSlop={8} style={{ paddingHorizontal: 16, paddingVertical: 6 }}>
      <Text style={{ color: c.muted, fontWeight: '600' }}>Logga ut</Text>
    </Pressable>
  );
}

function AppTabs({ admin }: { admin: boolean }) {
  const c = useColors();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.ink,
        headerTitleStyle: { fontWeight: '800' },
        headerRight: () => <SignOutButton />,
        tabBarActiveTintColor: c.accentText,
        tabBarInactiveTintColor: c.muted,
        sceneStyle: { backgroundColor: c.bg },
        // Vanliga användare har bara Tasks och behöver ingen flikrad.
        tabBarStyle: admin ? { backgroundColor: c.surface, borderTopColor: c.line } : { display: 'none' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Tasks', headerTitle: 'Dagslistan', tabBarIcon: icon('checkbox-outline') }} />
      <Tabs.Screen name="planering" options={{ title: 'Planering', tabBarIcon: icon('calendar-outline'), href: admin ? undefined : null }} />
      <Tabs.Screen name="genomfort" options={{ title: 'Genomfört', tabBarIcon: icon('time-outline'), href: admin ? undefined : null }} />
    </Tabs>
  );
}

function Gate() {
  const s = useStore();
  const c = useColors();
  let body;
  if (s.session.status === 'loading') body = <ActivityIndicator color={c.accent} style={{ flex: 1 }} />;
  else if (s.session.status === 'signedOut') body = <Login />;
  else if (s.role === 'none') body = <NoAccess />;
  else body = <AppTabs admin={s.isAdmin} />;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style="dark" />
      {body}
      <Toast />
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Gate />
      </StoreProvider>
    </SafeAreaProvider>
  );
}
