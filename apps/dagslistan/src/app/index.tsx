import { Link } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { DatePicker } from '../components/DatePicker';
import { TaskRow } from '../components/TaskRow';
import { Avatar, Card, Chip, H1, Label, Muted, Pill, Screen, Segmented, styles } from '../components/ui';
import { APP_MODE } from '../lib/config';
import { addDays, cap, formatLong, formatShort, isoWeek, parseIso, relativeDay, today } from '../lib/dates';
import { countOpenOn, countOverdue, openFor, overdueFor, type Occurrence } from '../lib/occurrences';
import { useStore, type ViewMode } from '../lib/store';
import { useColors } from '../lib/theme';
import type { Person } from '../lib/types';

/** Hur många dagar framåt "Kommande" visar. */
const HORIZON = 14;

export default function TasksScreen() {
  const s = useStore();
  const c = useColors();
  const t0 = today();
  const { mode, filter, pick } = s.prefs;

  const days = useMemo(() => {
    if (mode === 'today') return [t0];
    if (mode === 'upcoming') return Array.from({ length: HORIZON + 1 }, (_, i) => addDays(t0, i));
    return [pick];
  }, [mode, pick, t0]);
  const showOverdue = mode !== 'pick' || pick === t0;

  const left = countOpenOn(s.tasks, s.doneIds, t0);
  const late = countOverdue(s.tasks, s.doneIds);
  const doneToday = s.done.filter((d) => d.doneAt >= parseIso(t0).getTime()).length;

  const visible = filter && s.person(filter) ? s.people.filter((p) => p.id === filter) : s.people;

  return (
    <Screen>
      {s.backendKind === 'demo' ? (
        <View style={{ backgroundColor: c.warnSoft, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: c.warn }}>Demoläge: Firebase är inte inställt än, så allt sparas bara på den här enheten.</Text>
        </View>
      ) : null}
      {s.error ? (
        <View style={{ backgroundColor: c.warnSoft, padding: 12, borderRadius: 10 }}>
          <Text style={{ color: c.warn }}>{s.error}</Text>
        </View>
      ) : null}

      <View style={{ gap: 6 }}>
        <Label>Vecka {isoWeek(new Date())}</Label>
        <H1>{cap(formatLong(t0))}</H1>
        {s.ready ? (
          <View style={[styles.wrap, { marginTop: 6 }]}>
            <Pill>{left} kvar i dag</Pill>
            {late ? <Pill tone="warn">{late} försenade</Pill> : null}
            <Pill tone="ok">{doneToday} klara i dag</Pill>
          </View>
        ) : null}
      </View>

      <View style={{ gap: 10 }}>
        <View style={[styles.wrap, { alignItems: 'center' }]}>
          <Segmented<ViewMode>
            value={mode}
            onChange={(m) => s.setPrefs({ mode: m, pick: m === 'pick' ? pick : t0 })}
            options={[
              { value: 'today', label: 'I dag' },
              { value: 'upcoming', label: 'Kommande' },
              { value: 'pick', label: 'Välj dag' },
            ]}
          />
          {mode === 'pick' ? <DatePicker value={pick} onChange={(d) => s.setPrefs({ pick: d })} /> : null}
        </View>
        {s.people.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Alla" selected={!filter} onPress={() => s.setPrefs({ filter: '' })} />
            {s.people.map((p) => (
              <Chip key={p.id} label={p.name} person={p} selected={filter === p.id} onPress={() => s.setPrefs({ filter: p.id })} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {!s.ready ? (
        <ActivityIndicator color={c.accent} style={{ marginTop: 24 }} />
      ) : s.people.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>Inga personer än</Text>
          {APP_MODE === 'checker' ? (
            <Muted>Här visas tasks så fort någon har planerat dem.</Muted>
          ) : (
            <Link href="/planering" style={{ color: c.accent, fontWeight: '700', fontSize: 15 }}>
              Lägg till personer och tasks under Planering →
            </Link>
          )}
        </Card>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          {visible.map((p) => (
            <PersonColumn key={p.id} person={p} days={days} showOverdue={showOverdue} mode={mode} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function PersonColumn({ person, days, showOverdue, mode }: { person: Person; days: string[]; showOverdue: boolean; mode: ViewMode }) {
  const s = useStore();
  const c = useColors();

  const groups: { key: string; label: string; extra?: string; late: boolean; items: Occurrence[] }[] = [];
  if (showOverdue) {
    const items = overdueFor(s.tasks, s.doneIds, person.id);
    if (items.length) groups.push({ key: 'late', label: 'Försenade', late: true, items });
  }
  for (const d of days) {
    const items = openFor(s.tasks, s.doneIds, person.id, d);
    if (!items.length) continue;
    const rel = relativeDay(d);
    groups.push({ key: d, label: rel, extra: rel.startsWith('I ') ? formatShort(d) : undefined, late: false, items });
  }
  const count = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Card style={{ flexGrow: 1, flexBasis: 300, gap: 4 }}>
      <View style={[styles.row, { paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: c.line }]}>
        <Avatar person={person} size={34} />
        <Text style={{ color: c.ink, fontSize: 19, fontWeight: '700', flex: 1 }}>{person.name}</Text>
        {count ? <Text style={{ color: c.muted, fontWeight: '700', fontSize: 13 }}>{count} kvar</Text> : null}
      </View>
      {groups.length === 0 ? (
        <Muted style={{ paddingVertical: 12, paddingHorizontal: 6 }}>{mode === 'upcoming' ? 'Inget planerat framöver.' : 'Allt klart! ✓'}</Muted>
      ) : (
        groups.map((g) => (
          <View key={g.key} style={{ marginTop: 10 }}>
            <View style={[styles.row, { gap: 6, marginBottom: 2 }]}>
              <Label warn={g.late}>{g.label}</Label>
              {g.extra ? <Muted style={{ fontSize: 12 }}>· {g.extra}</Muted> : null}
            </View>
            {g.items.map(({ task, date }) => (
              <TaskRow
                key={`${task.id}-${date}`}
                task={task}
                date={date}
                showDate={g.late}
                others={task.assignees.filter((a) => a !== person.id).map(s.person).filter((x): x is Person => !!x)}
                onCheck={() => s.markDone(task, date, person.id)}
              />
            ))}
          </View>
        ))
      )}
    </Card>
  );
}
