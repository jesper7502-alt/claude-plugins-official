import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { radius, useColors } from '../lib/theme';
import { Button, H2 } from './ui';

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

/** Knapp som visar vald tid och öppnar en ruta där man väljer timme och minut. `null` = ingen tid. */
export function TimePicker({ value, onChange, label }: { value: string | null; onChange: (t: string | null) => void; label?: string }) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label ?? 'Tid'}: ${value ?? 'ingen tid'}. Tryck för att ändra.`}
        style={{
          minHeight: 44,
          borderWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          borderRadius: radius.md,
          paddingHorizontal: 12,
          justifyContent: 'center',
          alignSelf: 'flex-start',
          minWidth: 120,
        }}
      >
        <Text style={{ color: value ? c.ink : c.muted, fontSize: 16 }}>{value ? `kl. ${value}` : 'Ingen tid'}</Text>
      </Pressable>
      {open ? (
        <TimeSheet
          value={value}
          onClose={() => setOpen(false)}
          onPick={(t) => {
            onChange(t);
            setOpen(false);
          }}
        />
      ) : null}
    </View>
  );
}

function TimeSheet({ value, onPick, onClose }: { value: string | null; onPick: (t: string | null) => void; onClose: () => void }) {
  const c = useColors();
  const [hour, setHour] = useState(value?.slice(0, 2) ?? '08');
  const [minute, setMinute] = useState(value?.slice(3, 5) ?? '00');

  const cell = (text: string, selected: boolean, onPress: () => void, label: string) => (
    <View key={text} style={{ width: '16.66%', padding: 3 }}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        style={({ pressed }) => ({
          paddingVertical: 8,
          borderRadius: radius.sm,
          alignItems: 'center',
          backgroundColor: selected ? c.accent : pressed ? c.surface2 : 'transparent',
        })}
      >
        <Text style={{ color: selected ? c.accentInk : c.ink, fontWeight: selected ? '700' : '500', fontVariant: ['tabular-nums'] }}>{text}</Text>
      </Pressable>
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 16 }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ alignSelf: 'center', width: '100%', maxWidth: 360, backgroundColor: c.surface, borderRadius: radius.lg, padding: 18, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <H2>Välj tid</H2>
            <Text style={{ color: c.accentText, fontSize: 22, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {hour}:{minute}
            </Text>
          </View>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>TIMME</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
            {HOURS.map((h) => cell(h, h === hour, () => setHour(h), `Timme ${h}`))}
          </View>
          <Text style={{ color: c.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8 }}>MINUT</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 }}>
            {MINUTES.map((m) => cell(m, m === minute, () => setMinute(m), `Minut ${m}`))}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <Button label="Ingen tid" variant="ghost" onPress={() => onPick(null)} />
            <Button label="Klar" onPress={() => onPick(`${hour}:${minute}`)} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
