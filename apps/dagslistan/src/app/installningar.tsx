import { router } from 'expo-router';
import { ActivityIndicator } from 'react-native';

import { CalendarCard } from '../components/CalendarCard';
import { PeopleCard } from '../components/PeopleCard';
import { Button, Muted, Screen } from '../components/ui';
import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';

/** Personer och vilka Google-kalendrar som hör till dem. Nås från knappen i Planering. */
export default function SettingsScreen() {
  const s = useStore();
  const c = useColors();

  if (!s.isAdmin) {
    return (
      <Screen>
        <Muted>Den här sidan är bara för admin.</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Button label="‹ Tillbaka till Planering" variant="ghost" onPress={() => router.navigate('/planering')} />
      {!s.ready ? (
        <ActivityIndicator color={c.accent} />
      ) : (
        <>
          <PeopleCard />
          <CalendarCard />
        </>
      )}
    </Screen>
  );
}
