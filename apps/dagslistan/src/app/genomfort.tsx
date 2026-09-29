import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Avatar, Button, Card, Chip, Label, Muted, Screen, Segmented, styles } from '../components/ui';
import { addDays, formatTime, parseIso, relativeDay, toIso, today } from '../lib/dates';
import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';
import type { Done } from '../lib/types';

type Period = '7' | '30' | 'all';
const DAY_MS = 864e5;

export default function HistoryScreen() {
  const s = useStore();
  const c = useColors();
  const [personId, setPersonId] = useState('');
  const [period, setPeriod] = useState<Period>('7');
  // Aktuell tid för Ångra-gränsen, uppdaterad varje minut.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const from = period === 'all' ? 0 : parseIso(addDays(today(), -(Number(period) - 1))).getTime();
  const rows = s.done.filter((d) => (!personId || d.doneBy === personId) && d.doneAt >= from);

  // Grupp per dag då tasken bockades av.
  const byDay = new Map<string, Done[]>();
  for (const d of rows) {
    const day = toIso(new Date(d.doneAt));
    byDay.set(day, [...(byDay.get(day) ?? []), d]);
  }

  // Planerare kan ångra allt; andra (i Firebase) bara det senaste dygnet.
  const canUndo = (d: Done) => s.isAdmin || now - d.doneAt < DAY_MS;

  // Fliken syns bara för admin, men sidan kan nås via adressen.
  if (!s.isAdmin) {
    return (
      <Screen>
        <Muted>Historiken är bara för admin. Du kan bocka av tasks under Tasks.</Muted>
      </Screen>
    );
  }

  return (
    <Screen>
      <Muted>{s.ready ? (rows.length === 1 ? '1 task genomförd' : `${rows.length} tasks genomförda`) : ''}</Muted>

      <View style={{ gap: 10 }}>
        <Segmented<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: '7', label: '7 dagar' },
            { value: '30', label: '30 dagar' },
            { value: 'all', label: 'Allt' },
          ]}
        />
        {s.people.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Chip label="Alla" selected={!personId} onPress={() => setPersonId('')} />
            {s.people.map((p) => (
              <Chip key={p.id} label={p.name} person={p} selected={personId === p.id} onPress={() => setPersonId(p.id)} />
            ))}
          </ScrollView>
        ) : null}
      </View>

      {!s.ready ? (
        <ActivityIndicator color={c.accent} />
      ) : rows.length === 0 ? (
        <Card style={{ alignItems: 'center', paddingVertical: 36 }}>
          <Text style={{ color: c.ink, fontSize: 20, fontWeight: '700' }}>{s.done.length ? 'Inget matchar filtret' : 'Inget genomfört ännu'}</Text>
          <Muted>{s.done.length ? 'Välj en längre period eller en annan person.' : 'Det som bockas av under Tasks hamnar här.'}</Muted>
        </Card>
      ) : (
        [...byDay].map(([day, list]) => (
          <View key={day} style={{ gap: 6 }}>
            <Label>{relativeDay(day)}</Label>
            <Card style={{ paddingVertical: 4, gap: 0 }}>
              {list.map((d, i) => {
                const p = s.person(d.doneBy);
                const planned = d.date !== day ? ` · planerad ${relativeDay(d.date).toLowerCase()}` : '';
                return (
                  <View key={d.id} style={[styles.row, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }]}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: c.accentText, fontWeight: '900', fontSize: 13 }}>✓</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ color: c.ink, fontWeight: '600', fontSize: 16 }}>{d.title}</Text>
                      <View style={[styles.row, { gap: 6 }]}>
                        <Avatar person={p ?? { name: d.doneByName, color: '#7A8580' }} size={20} />
                        <Muted style={{ fontSize: 13, flexShrink: 1 }}>
                          {p?.name ?? d.doneByName} · kl. {formatTime(d.doneAt)}
                          {planned}
                        </Muted>
                      </View>
                    </View>
                    {canUndo(d) ? <Button label="Ångra" variant="ghost" onPress={() => void s.undoDone(d.id)} /> : null}
                  </View>
                );
              })}
            </Card>
          </View>
        ))
      )}
    </Screen>
  );
}
