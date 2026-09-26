import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { cap, formatLong, MONTHS, parseIso, relativeDay, toIso, today } from '../lib/dates';
import { radius, useColors } from '../lib/theme';
import { Button } from './ui';

const WEEK = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];

/** Knapp som visar valt datum och öppnar en månadskalender. Fungerar likadant på telefon och webb. */
export function DatePicker({ value, onChange, label }: { value: string; onChange: (d: string) => void; label?: string }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Datum'}: ${formatLong(value)}. Tryck för att ändra.`}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          minWidth: 180,
        }}
      >
        <Text style={{ color: c.ink, fontSize: 16 }}>
          {relativeDay(value)}
          {relativeDay(value).startsWith('I ') ? <Text style={{ color: c.muted }}>{`  ·  ${formatLong(value)}`}</Text> : null}
        </Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={{ alignSelf: 'center', width: '100%', maxWidth: 360 }}>
            <Calendar
              value={value}
              onPick={(d) => {
                onChange(d);
                setOpen(false);
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function Calendar({ value, onPick }: { value: string; onPick: (d: string) => void }) {
  const c = useColors();
  const start = parseIso(value);
  const [ym, setYm] = useState({ y: start.getFullYear(), m: start.getMonth() });
  const t0 = today();

  const first = new Date(ym.y, ym.m, 1);
  const offset = (first.getDay() + 6) % 7; // måndag först
  const days = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => toIso(new Date(ym.y, ym.m, i + 1))),
  ];
  while (cells.length % 7) cells.push(null);

  const shift = (n: number) => setYm(({ y, m }) => ({ y: m + n < 0 ? y - 1 : m + n > 11 ? y + 1 : y, m: (m + n + 12) % 12 }));

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: radius.lg, padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pressable onPress={() => shift(-1)} accessibilityLabel="Föregående månad" hitSlop={10} style={{ padding: 6 }}>
          <Text style={{ color: c.ink, fontSize: 20 }}>‹</Text>
        </Pressable>
        <Text style={{ color: c.ink, fontSize: 17, fontWeight: '700' }}>{cap(MONTHS[ym.m])} {ym.y}</Text>
        <Pressable onPress={() => shift(1)} accessibilityLabel="Nästa månad" hitSlop={10} style={{ padding: 6 }}>
          <Text style={{ color: c.ink, fontSize: 20 }}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>
        {WEEK.map((w, i) => (
          <Text key={i} style={{ flex: 1, textAlign: 'center', color: c.muted, fontSize: 12, fontWeight: '700' }}>{w}</Text>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {cells.map((d, i) => {
          const sel = d === value;
          const isToday = d === t0;
          return (
            <View key={i} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 2 }}>
              {d ? (
                <Pressable
                  onPress={() => onPick(d)}
                  accessibilityRole="button"
                  accessibilityLabel={formatLong(d)}
                  accessibilityState={{ selected: sel }}
                  style={{
                    flex: 1,
                    borderRadius: radius.pill,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: sel ? c.accent : 'transparent',
                    borderWidth: isToday && !sel ? 1 : 0,
                    borderColor: c.accent,
                  }}
                >
                  <Text style={{ color: sel ? c.accentInk : c.ink, fontWeight: isToday || sel ? '700' : '400' }}>{parseIso(d).getDate()}</Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
        <Button label="I dag" variant="ghost" onPress={() => onPick(t0)} />
      </View>
    </View>
  );
}
