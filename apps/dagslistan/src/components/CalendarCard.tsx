import { useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { useCalendar } from '../lib/calendar/CalendarProvider';
import { formatTime, relativeDay, toIso } from '../lib/dates';
import { useStore } from '../lib/store';
import { radius, useColors } from '../lib/theme';
import type { Person } from '../lib/types';
import { Avatar, Button, Card, Field, H2, Muted, Pill, styles } from './ui';

function lastSyncText(at?: number, result?: string): string | null {
  if (!at) return null;
  return `Senast hämtat ${relativeDay(toIso(new Date(at))).toLowerCase()} kl. ${formatTime(at)}` + (result ? ` · ${result}` : '');
}

/** Knappen i Planering som hämtar från Google Kalender (loggar in med Google vid behov). */
export function CalendarSyncButton() {
  const s = useStore();
  const cal = useCalendar();
  const c = useColors();
  const hasLinks = Object.keys(cal.settings.calendars).length > 0;
  const busy = cal.status !== 'idle';
  const label = cal.status === 'syncing' ? 'Hämtar…' : cal.status === 'connecting' ? 'Loggar in…' : 'Uppdatera från Google Kalender';

  const press = () => {
    if (!hasLinks) {
      s.showToast('Koppla en Google-kalender till en person först.');
      router.push('/installningar');
      return;
    }
    void cal.sync();
  };

  return (
    <View style={{ gap: 4 }}>
      <Button label={label} variant="secondary" onPress={press} disabled={busy} />
      {cal.error ? (
        <Text style={{ color: c.warn, fontSize: 13 }}>{cal.error}</Text>
      ) : (
        <Muted style={{ fontSize: 13 }}>{lastSyncText(cal.settings.lastSync, cal.settings.lastResult) ?? 'Inte hämtat ännu.'}</Muted>
      )}
    </View>
  );
}

/** Koppling till Google Kalender: vilken kalender som hör till vilken person, och nyckelord. */
export function CalendarCard() {
  const s = useStore();
  const cal = useCalendar();
  const c = useColors();
  const [keyword, setKeyword] = useState<string | null>(null);
  const [picking, setPicking] = useState<Person | null>(null);

  const links = cal.settings.calendars;
  const hasLinks = Object.keys(links).length > 0;
  const kw = keyword ?? cal.settings.keyword;

  const last = lastSyncText(cal.settings.lastSync, cal.settings.lastResult);

  return (
    <Card>
      <View style={[styles.row, { justifyContent: 'space-between', flexWrap: 'wrap' }]}>
        <H2>Google Kalender</H2>
        {cal.connected ? <Pill tone="ok">Ansluten</Pill> : hasLinks ? <Pill>Inte inloggad</Pill> : null}
      </View>
      <Muted>
        Välj vilken Google-kalender som hör till varje person. Händelser med{' '}
        <Text style={{ fontWeight: '700', color: c.ink }}>{cal.settings.keyword}</Text> i titeln blir tasks för den personen. Kalendern
        hämtas automatiskt var 15:e minut när du har sidan öppen, och med knappen i Planering.
      </Muted>

      {s.people.length === 0 ? (
        <Muted>Lägg till personer först.</Muted>
      ) : (
        s.people.map((p, i) => {
          const link = links[p.id];
          return (
            <View key={p.id} style={[styles.row, { paddingTop: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }]}>
              <Avatar person={p} size={30} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.ink, fontWeight: '600', fontSize: 15 }}>{p.name}</Text>
                <Muted style={{ fontSize: 13 }}>{link ? `📅 ${link.name}` : 'Ingen kalender'}</Muted>
              </View>
              <Button
                label={link ? 'Byt' : 'Välj kalender'}
                variant="ghost"
                onPress={() => (cal.connected ? setPicking(p) : void cal.connect().then((ok) => ok && setPicking(p)))}
              />
            </View>
          );
        })
      )}

      <View style={[styles.row, { alignItems: 'flex-end' }]}>
        <View style={{ flex: 1 }}>
          <Field label="Nyckelord i titeln" value={kw} onChangeText={setKeyword} autoCapitalize="none" maxLength={30} />
        </View>
        {keyword !== null && keyword.trim() !== cal.settings.keyword ? (
          <Button
            label="Spara"
            variant="ghost"
            onPress={() => {
              void cal.setKeyword(keyword);
              setKeyword(null);
            }}
          />
        ) : null}
      </View>
      <Muted style={{ fontSize: 13 }}>
        Exempel: en händelse som heter ”{cal.settings.keyword} Tvätta” blir tasken ”Tvätta”.
      </Muted>

      {cal.error ? <Text style={{ color: c.warn }}>{cal.error}</Text> : null}
      {last ? <Muted style={{ fontSize: 13 }}>{last}</Muted> : null}

      <CalendarPicker person={picking} onClose={() => setPicking(null)} />
    </Card>
  );
}

function CalendarPicker({ person, onClose }: { person: Person | null; onClose: () => void }) {
  const cal = useCalendar();
  const c = useColors();
  if (!person) return null;
  const current = cal.settings.calendars[person.id]?.id;

  const choose = async (calendar: { id: string; name: string } | null) => {
    onClose();
    await cal.setPersonCalendar(person.id, calendar);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 16 }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{ alignSelf: 'center', width: '100%', maxWidth: 420, maxHeight: '80%', backgroundColor: c.surface, borderRadius: radius.lg, padding: 18, gap: 12 }}
        >
          <H2>Kalender för {person.name}</H2>
          {!cal.calendars ? (
            <ActivityIndicator color={c.accent} />
          ) : (
            <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 6 }}>
              {cal.calendars.map((k) => {
                const selected = k.id === current;
                return (
                  <Pressable
                    key={k.id}
                    onPress={() => void choose({ id: k.id, name: k.name })}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={({ pressed }) => ({
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      padding: 12,
                      borderRadius: radius.md,
                      borderWidth: 1,
                      borderColor: selected ? c.accent : c.line,
                      backgroundColor: selected ? c.accentSoft : pressed ? c.surface2 : c.surface,
                    })}
                  >
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: k.color ?? c.accent }} />
                    <Text style={{ color: c.ink, fontSize: 15, flex: 1 }}>{k.name}</Text>
                    {k.primary ? <Muted style={{ fontSize: 12 }}>Huvudkalender</Muted> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            {current ? <Button label="Ta bort koppling" variant="danger" onPress={() => void choose(null)} /> : <View />}
            <Button label="Stäng" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
