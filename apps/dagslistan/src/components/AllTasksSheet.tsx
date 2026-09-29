import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { formatShort, relativeDay } from '../lib/dates';
import { byTimeThenTitle } from '../lib/occurrences';
import { useStore } from '../lib/store';
import { radius, useColors } from '../lib/theme';
import { doneKey, REPEAT_LABEL, type Task } from '../lib/types';
import { Avatar, Button, H2, Muted, styles } from './ui';

/** Fönster med alla tasks. Ett tryck på en egen task öppnar den för ändring; kalendertasks ändras i Google Kalender. */
export function AllTasksSheet({ visible, onClose, onEdit }: { visible: boolean; onClose: () => void; onEdit: (t: Task) => void }) {
  const s = useStore();
  const c = useColors();
  const [confirm, setConfirm] = useState<string | null>(null);

  const tasks = [...s.tasks].sort((a, b) => a.date.localeCompare(b.date) || byTimeThenTitle(a, b));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 16 }} onPress={onClose}>
        <Pressable
          onPress={() => {}}
          style={{ alignSelf: 'center', width: '100%', maxWidth: 560, maxHeight: '90%', backgroundColor: c.surface, borderRadius: radius.lg, padding: 18, gap: 12 }}
        >
          <View style={[styles.row, { justifyContent: 'space-between' }]}>
            <H2>Alla tasks</H2>
            <Muted style={{ fontSize: 13 }}>{tasks.length} st</Muted>
          </View>
          <ScrollView style={{ flexGrow: 0 }}>
            {tasks.length === 0 ? <Muted>Inga tasks ännu.</Muted> : null}
            {tasks.map((t, i) => {
              const ps = t.assignees.map(s.person).filter((p) => !!p);
              const rep = t.repeat !== 'none';
              const gcal = t.source === 'gcal';
              const when = (rep ? `${REPEAT_LABEL[t.repeat]} från ${formatShort(t.date)}` : relativeDay(t.date)) + (t.time ? ` kl. ${t.time}` : '');
              const status = !rep && s.doneIds.has(doneKey(t.id, t.date)) ? ' · klar' : '';
              return (
                <View key={t.id} style={[styles.row, { paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.line }]}>
                  <View style={{ flexDirection: 'row' }}>
                    {ps.map((p, k) => (
                      <View key={p.id} style={{ marginLeft: k ? -8 : 0, borderWidth: 2, borderColor: c.surface, borderRadius: radius.pill }}>
                        <Avatar person={p} size={26} />
                      </View>
                    ))}
                  </View>
                  <Pressable
                    style={{ flex: 1 }}
                    onPress={() => {
                      if (gcal) return s.showToast('Kalendertasks ändras i Google Kalender.');
                      onEdit(t);
                      onClose();
                    }}
                    accessibilityRole="button"
                    accessibilityHint={gcal ? 'Ändras i Google Kalender' : 'Tryck för att ändra'}
                  >
                    <Text style={{ color: c.ink, fontWeight: '600', fontSize: 16 }}>{t.title}</Text>
                    <Muted style={{ fontSize: 13 }}>
                      {when}
                      {status} · {ps.map((p) => p.name).join(', ')}
                    </Muted>
                    {gcal ? <Text style={{ color: c.accentText, fontSize: 12, fontWeight: '600', marginTop: 2 }}>📅 Från Google Kalender</Text> : null}
                  </Pressable>
                  {gcal ? null : confirm === t.id ? (
                    <Button
                      label="Säker? Ta bort"
                      variant="danger"
                      onPress={() => {
                        setConfirm(null);
                        void s.removeTask(t.id);
                      }}
                    />
                  ) : (
                    <Button label="Ta bort" variant="ghost" onPress={() => setConfirm(t.id)} />
                  )}
                </View>
              );
            })}
          </ScrollView>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
            <Button label="Stäng" variant="ghost" onPress={onClose} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
