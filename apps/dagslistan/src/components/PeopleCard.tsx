import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { useStore } from '../lib/store';
import { useColors } from '../lib/theme';
import { AvatarButton } from './AnimalPicker';
import { Button, Card, Field, H2, Muted, styles } from './ui';

/** Lägga till personer, byta namn och djur, och ta bort personer. */
export function PeopleCard() {
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
            <AvatarButton person={p} size={34} />
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
                <Muted style={{ fontSize: 13 }}>
                  {n} {n === 1 ? 'task' : 'tasks'} · tryck för att byta namn
                </Muted>
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
