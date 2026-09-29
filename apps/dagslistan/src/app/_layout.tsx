import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Login, NoAccess } from '../components/Login';
import { tabIcon } from '../components/TabIcon';
import { Toast } from '../components/Toast';
import { CalendarProvider } from '../lib/calendar/CalendarProvider';
import { APP_NAME } from '../lib/config';
import { StoreProvider, useStore } from '../lib/store';
import { useColors } from '../lib/theme';

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
      <Tabs.Screen name="index" options={{ title: 'Tasks', headerTitle: APP_NAME, tabBarIcon: tabIcon('tasks') }} />
      <Tabs.Screen name="planering" options={{ title: 'Planering', tabBarIcon: tabIcon('planering'), href: admin ? undefined : null }} />
      <Tabs.Screen name="genomfort" options={{ title: 'Genomfört', tabBarIcon: tabIcon('genomfort'), href: admin ? undefined : null }} />
      {/* Nås via knappen i Planering, syns inte i flikraden. */}
      <Tabs.Screen name="installningar" options={{ title: 'Personer & kalendrar', href: null }} />
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
        <CalendarProvider>
          <Gate />
        </CalendarProvider>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
