import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { DatePicker } from '../components/DatePicker';
import { Avatar, Button, Card, Chip, Field, H1, H2, Muted, Screen, styles } from '../components/ui';
import { APP_MODE } from '../lib/config';
import { formatShort, relativeDay, today } from '../lib/dates';
import { useStore } from '../lib/store';
import { radius, useColors } from '../lib/theme';
import { doneKey, REPEAT_LABEL, type Repeat, type Task } from '../lib/types';

export default function PlanningScreen() {
  const s = useStore();
  const c = useColors();

  if (APP_MODE === 'checker') {
    return (
      <Screen safeTop>
        <H1>Planering</H1>
        <Muted>Planering görs i appen. Här kan du bara bocka av tasks.</Muted>
      </Screen>
    );
  }
  if (!s.session.signedIn) return <Login />;
  if (!s.session.isAdmin) {
    return (
      <Screen safeTop>
        <H1>Planering</H1>
        <Card>
          <H2>Kontot saknar behörighet</H2>
          <Muted>
            Du är inloggad som {s.session.email}, men kontot är inte planerare än. Lägg till ett dokument i samlingen
            admins i Firestore med det här id:t (se README):
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

  return (
    <Screen safeTop>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <H1>Planering</H1>
          <Muted>Ändringar syns direkt för alla.</Muted>
        </View>
        {s.backendKind === 'firebase' ? (
          <View style={[styles.row, { flexShrink: 1 }]}>
            <Muted>{s.session.email}</Muted>
            <Button label="Logga ut" variant="ghost" onPress={() => void s.signOut()} />
          </View>
        ) : null}
      </View>
      {!s.ready ? (
        <ActivityIndicator color={c.accent} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <View style={{ flexGrow: 1, flexBasis: 300, gap: 16 }}>
            <PeopleCard />
          </View>
          <View style={{ flexGrow: 1.6, flexBasis: 340, gap: 16 }}>
            <TaskEditor />
          </View>
        </View>
      )}
    </Screen>
  );
}

function Login() {
  const s = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const c = useColors();

  const submit = async () => {
    if (!email.trim() || !password) {
      setErr('Fyll i e-post och lösenord.');
      return;
    }
    setBusy(true);
    setErr(await s.signIn(email.trim(), password));
    setBusy(false);
  };

  return (
    <Screen safeTop>
      <H1>Planering</H1>
      <Card style={{ maxWidth: 440 }}>
        <H2>Logga in</H2>
        <Muted>Bara planerare kan lägga till och ändra personer och tasks. Alla kan bocka av under Tasks.</Muted>
        <Field label="E-post" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" inputMode="email" />
        <Field label="Lösenord" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={submit} />
        {err ? <Text style={{ color: c.warn }}>{err}</Text> : null}
        <View style={styles.row}>
          <Button label={busy ? 'Loggar in…' : 'Logga in'} onPress={submit} disabled={busy} />
        </View>
      </Card>
    </Screen>
  );
}

function PeopleCard() {
  const s = useStore();
  const c = useColors();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    setName('');
    await s.addPerson(n);
  };
  const saveName = async () => {
    if (!editing) return;
    const n = editing.name.trim();
    if (n) await s.renamePerson(editing.id, n);
    setEditing(null);
  };

  return (
    <Card>
      <H2>Personer</H2>
      <View style={[styles.row, { alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Namn" value={name} onChangeText={setName} placeholder="t.ex. Anna" maxLength={40} onSubmitEditing={add} returnKeyType="done" />
        </View>
        <Button label="Lägg till" onPress={add} />
      </View>
      {s.people.length === 0 ? <Muted>Lägg till den första personen ovan.</Muted> : null}
      {s.people.map((p, i) => {
        const n = s.tasks.filter((t) => t.assignees.includes(p.id)).length;
        const isEditing = editing?.id === p.id;
        return (
          <View key={p.id} style={[styles.row, { paddingTop: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }]}>
            <Avatar person={p} size={34} />
            {isEditing ? (
              <TextInput
                value={editing.name}
                onChangeText={(t) => setEditing({ id: p.id, name: t })}
                onSubmitEditing={saveName}
                autoFocus
                maxLength={40}
                style={[styles.input, { flex: 1, backgroundColor: c.surface, borderColor: c.accent, color: c.ink }]}
              />
            ) : (
              <Pressable style={{ flex: 1 }} onPress={() => setEditing({ id: p.id, name: p.name })} accessibilityHint="Tryck för att byta namn">
                <Text style={{ color: c.ink, fontWeight: '600', fontSize: 16 }}>{p.name}</Text>
                <Muted style={{ fontSize: 13 }}>{n} {n === 1 ? 'task' : 'tasks'} · tryck för att byta namn</Muted>
              </Pressable>
            )}
            {isEditing ? (
              <Button label="Spara" variant="ghost" onPress={saveName} />
            ) : confirm === p.id ? (
              <Button
                label="Säker? Ta bort"
                variant="danger"
                onPress={() => {
                  setConfirm(null);
                  void s.removePerson(p.id);
                }}
              />
            ) : (
              <Button label="Ta bort" variant="ghost" onPress={() => setConfirm(p.id)} />
            )}
          </View>
        );
      })}
    </Card>
  );
}

const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'];

function TaskEditor() {
  const s = useStore();
  const c = useColors();
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(today());
  const [repeat, setRepeat] = useState<Repeat>('none');
  const [assign, setAssign] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);

  const reset = () => {
    setEditId(null);
    setTitle('');
    setRepeat('none');
    setAssign([]);
    setErr(null);
  };
  const edit = (t: Task) => {
    setEditId(t.id);
    setTitle(t.title);
    setDate(t.date);
    setRepeat(t.repeat);
    setAssign(t.assignees.filter((a) => s.person(a)));
    setErr(null);
  };
  const toggle = (id: string) => setAssign((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const submit = async () => {
    const t = title.trim();
    const msg = !t ? 'Skriv vad som ska göras.' : !assign.length ? 'Välj minst en person.' : null;
    setErr(msg);
    if (msg) return;
    const input = { title: t, date, repeat, assignees: assign };
    const ok = editId ? await s.updateTask(editId, input) : await s.addTask(input);
    if (ok) {
      s.showToast(editId ? `”${t}” sparad` : `”${t}” tillagd`);
      reset();
    }
  };

  const tasks = [...s.tasks].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'sv'));

  return (
    <>
      <Card style={editId ? { borderColor: c.accent } : undefined}>
        <H2>{editId ? 'Ändra task' : 'Ny task'}</H2>
        <Field label="Vad ska göras?" value={title} onChangeText={setTitle} placeholder="t.ex. Tömma diskmaskinen" maxLength={120} />
        <DatePicker label={repeat === 'none' ? 'Dag' : 'Första dagen'} value={date} onChange={setDate} />
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Upprepa</Text>
          <View style={styles.wrap}>
            {REPEATS.map((r) => (
              <Chip key={r} label={REPEAT_LABEL[r]} selected={repeat === r} onPress={() => setRepeat(r)} />
            ))}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>Vem ska göra den?</Text>
          {s.people.length ? (
            <View style={styles.wrap}>
              {s.people.map((p) => (
                <Chip key={p.id} label={p.name} person={p} selected={assign.includes(p.id)} onPress={() => toggle(p.id)} />
              ))}
            </View>
          ) : (
            <Muted>Lägg till personer först.</Muted>
          )}
          <Muted style={{ fontSize: 13 }}>Välj en eller flera. Det räcker att en bockar av den.</Muted>
        </View>
        {err ? <Text style={{ color: c.warn }}>{err}</Text> : null}
        <View style={styles.row}>
          <Button label={editId ? 'Spara ändringar' : 'Lägg till task'} onPress={submit} />
          {editId ? <Button label="Avbryt" variant="ghost" onPress={reset} /> : null}
        </View>
      </Card>

      <Card>
        <H2>Alla tasks</H2>
        {tasks.length === 0 ? <Muted>Inga tasks ännu.</Muted> : null}
        {tasks.map((t, i) => {
          const ps = t.assignees.map(s.person).filter((p) => !!p);
          const rep = t.repeat !== 'none';
          const when = rep ? `${REPEAT_LABEL[t.repeat]} från ${formatShort(t.date)}` : relativeDay(t.date);
          const status = !rep && s.doneIds.has(doneKey(t.id, t.date)) ? ' · klar' : '';
          return (
            <View key={t.id} style={[styles.row, { paddingTop: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }]}>
              <View style={{ flexDirection: 'row' }}>
                {ps.map((p, k) => (
                  <View key={p.id} style={{ marginLeft: k ? -8 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: radius.pill }}>
                    <Avatar person={p} size={26} />
                  </View>
                ))}
              </View>
              <Pressable style={{ flex: 1 }} onPress={() => edit(t)} accessibilityHint="Tryck för att ändra">
                <Text style={{ color: c.ink, fontWeight: '600', fontSize: 16 }}>{t.title}</Text>
                <Muted style={{ fontSize: 13 }}>
                  {when}
                  {status} · {ps.map((p) => p.name).join(', ')}
                </Muted>
              </Pressable>
              {confirm === t.id ? (
                <Button
                  label="Säker? Ta bort"
                  variant="danger"
                  onPress={() => {
                    setConfirm(null);
                    if (editId === t.id) reset();
                    void s.removeTask(t.id);
                  }}
                />
              ) : (
                <Button label="Ta bort" variant="ghost" onPress={() => setConfirm(t.id)} />
              )}
            </View>
          );
        })}
      </Card>
    </>
  );
}
