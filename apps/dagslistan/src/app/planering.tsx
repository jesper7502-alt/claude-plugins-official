import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AllTasksSheet } from '../components/AllTasksSheet';
import { CalendarSyncButton } from '../components/CalendarCard';
import { DatePicker } from '../components/DatePicker';
import { TimePicker } from '../components/TimePicker';
import { Button, Card, Chip, Field, H2, Muted, Screen, styles } from '../components/ui';
import { today } from '../lib/dates';
import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';
import { REPEAT_LABEL, type Repeat, type Task } from '../lib/types';

export default function PlanningScreen() {
  const s = useStore();
  const c = useColors();
  const [showAll, setShowAll] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);

  // Fliken syns bara för admin, men sidan kan nås via adressen.
  if (!s.isAdmin) {
    return (
      <Screen>
        <Muted>Planering är bara för admin. Du kan bocka av tasks under Tasks.</Muted>
      </Screen>
    );
  }
  if (!s.ready) {
    return (
      <Screen>
        <ActivityIndicator color={c.accent} />
      </Screen>
    );
  }

  return (
    <Screen>
      {/* key: formuläret laddas om med den valda taskens värden när man väljer en i Alla tasks. */}
      <TaskEditor key={editing?.id ?? 'new'} editing={editing} onDone={() => setEditing(null)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-start' }}>
        <View style={{ flexGrow: 1, flexBasis: 260 }}>
          <CalendarSyncButton />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 140 }}>
          <Button label="Alla tasks" variant="secondary" onPress={() => setShowAll(true)} />
        </View>
        <View style={{ flexGrow: 1, flexBasis: 200 }}>
          <Button label="Personer & kalendrar" variant="secondary" onPress={() => router.push('/installningar')} />
        </View>
      </View>
      <AllTasksSheet visible={showAll} onClose={() => setShowAll(false)} onEdit={setEditing} />
    </Screen>
  );
}

const REPEATS: Repeat[] = ['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'];

/** Formulär för ny task, eller för att ändra `editing`. */
function TaskEditor({ editing, onDone }: { editing: Task | null; onDone: () => void }) {
  const s = useStore();
  const c = useColors();
  const [title, setTitle] = useState(editing?.title ?? '');
  const [date, setDate] = useState(editing?.date ?? today());
  const [repeat, setRepeat] = useState<Repeat>(editing?.repeat ?? 'none');
  const [time, setTime] = useState<string | null>(editing?.time ?? null);
  const [assign, setAssign] = useState<string[]>(editing ? editing.assignees.filter((a) => s.person(a)) : []);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const reset = () => {
    setTitle('');
    setRepeat('none');
    setTime(null);
    setAssign([]);
    setErr(null);
    onDone();
  };
  const toggle = (id: string) => setAssign((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));

  const submit = async () => {
    const t = title.trim();
    const msg = !t ? 'Skriv vad som ska göras.' : !assign.length ? 'Välj minst en person.' : null;
    setErr(msg);
    if (msg) return;
    const input = { title: t, date, repeat, time, assignees: assign };
    const ok = editing ? await s.updateTask(editing.id, input) : await s.addTask(input);
    if (ok) {
      s.showToast(editing ? `”${t}” sparad` : `”${t}” tillagd`);
      reset();
    }
  };

  const remove = async () => {
    if (!editing) return;
    if (await s.removeTask(editing.id)) {
      s.showToast(`”${editing.title}” borttagen`);
      reset();
    }
  };

  return (
    <Card style={editing ? { borderColor: c.accent } : undefined}>
      <H2>{editing ? 'Ändra task' : 'Ny task'}</H2>
      <Field label="Vad ska göras?" value={title} onChangeText={setTitle} placeholder="t.ex. Tömma diskmaskinen" maxLength={120} />
      <View style={[styles.row, { flexWrap: 'wrap', alignItems: 'flex-start', gap: 12 }]}>
        <DatePicker label={repeat === 'none' ? 'Dag' : 'Första dagen'} value={date} onChange={setDate} />
        <TimePicker label="Tid (valfritt)" value={time} onChange={setTime} />
      </View>
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
          <Muted>Lägg till personer under Personer & kalendrar.</Muted>
        )}
        <Muted style={{ fontSize: 13 }}>Välj en eller flera. Det räcker att en bockar av den.</Muted>
      </View>
      {err ? <Text style={{ color: c.warn }}>{err}</Text> : null}
      <View style={[styles.row, { flexWrap: 'wrap' }]}>
        <Button label={editing ? 'Spara ändringar' : 'Lägg till task'} onPress={submit} />
        {editing ? <Button label="Avbryt" variant="ghost" onPress={reset} /> : null}
        {editing ? (
          <Button
            label={confirmDelete ? 'Säker? Ta bort' : 'Ta bort task'}
            variant={confirmDelete ? 'danger' : 'ghost'}
            onPress={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          />
        ) : null}
      </View>
    </Card>
  );
}
