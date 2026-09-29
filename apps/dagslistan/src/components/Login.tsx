import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { APP_ICON_URI } from '../lib/appIcon';
import { APP_NAME } from '../lib/config';
import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';
import { Button, Card, Field, H2, Muted, Screen, styles } from './ui';

function Brand() {
  const c = useColors();
  return (
    <View style={[styles.row, { alignSelf: 'center', marginTop: 24 }]}>
      <Image source={{ uri: APP_ICON_URI }} style={{ width: 40, height: 40 }} accessibilityElementsHidden />
      <Text style={{ color: c.ink, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 }}>{APP_NAME}</Text>
    </View>
  );
}

export function Login() {
  const s = useStore();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setErr('Fyll i e-post och lösenord.');
      return;
    }
    setBusy(true);
    const e = await s.signIn(email.trim(), password);
    setBusy(false);
    setErr(e);
  };

  return (
    <Screen safeTop>
      <Brand />
      <Card style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
        <H2>Logga in</H2>
        <Field
          label="E-post"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          inputMode="email"
          onSubmitEditing={submit}
        />
        <Field label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" onSubmitEditing={submit} />
        {err ? <Text style={{ color: c.warn }}>{err}</Text> : null}
        <Button label={busy ? 'Loggar in…' : 'Logga in'} onPress={submit} disabled={busy} />
        {s.backendKind === 'demo' ? (
          <Muted style={{ fontSize: 13 }}>
            Demoläge: skriv en e-post som börjar med admin för att logga in som admin, annars blir du vanlig användare.
            Lösenordet kan vara vad som helst.
          </Muted>
        ) : null}
      </Card>
    </Screen>
  );
}

/** Inloggad, men kontot finns varken bland admins eller members. */
export function NoAccess() {
  const s = useStore();
  const c = useColors();
  if (s.session.status !== 'signedIn') return null;
  return (
    <Screen safeTop>
      <Brand />
      <Card style={{ width: '100%', maxWidth: 480, alignSelf: 'center' }}>
        <H2>Kontot saknar behörighet</H2>
        <Muted>
          Du är inloggad som {s.session.email}, men kontot har inte fått åtkomst än. Be den som administrerar listan att
          lägga till det här id:t i members (eller admins) i Firebase:
        </Muted>
        <Text selectable style={{ color: c.ink, fontFamily: 'monospace', backgroundColor: c.surface2, padding: 10, borderRadius: 8 }}>
          {s.session.uid}
        </Text>
        <View style={styles.row}>
          <Button label="Logga ut" variant="ghost" onPress={() => void s.signOut()} />
        </View>
      </Card>
    </Screen>
  );
}
