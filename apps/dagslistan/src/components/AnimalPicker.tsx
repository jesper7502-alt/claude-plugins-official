import { useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';

import { ANIMALS } from '../lib/animals';
import { useStore } from '../lib/store';
import { radius, useColors } from '../lib/theme';
import type { Person } from '../lib/types';
import { Avatar, Button, H2 } from './ui';

/**
 * Personens avatar som knapp. Ett tryck öppnar en ruta där man väljer djur.
 * Den lilla pennan i hörnet visar att avataren går att ändra.
 */
export function AvatarButton({ person, size = 34 }: { person: Person; size?: number }) {
  const s = useStore();
  const c = useColors();
  const [open, setOpen] = useState(false);

  const pick = async (animal: string | null) => {
    setOpen(false);
    if (animal !== (person.animal ?? null)) await s.setAnimal(person.id, animal);
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Byt djur för ${person.name}`}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Avatar person={person} size={size} />
        <View
          style={{
            position: 'absolute',
            right: -3,
            bottom: -3,
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: c.surface,
            borderWidth: 1,
            borderColor: c.line,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 9, color: c.accentText, lineHeight: 11 }}>✎</Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(31,42,68,0.35)', justifyContent: 'center', padding: 16 }} onPress={() => setOpen(false)}>
          <Pressable
            onPress={() => {}}
            style={{ alignSelf: 'center', width: '100%', maxWidth: 420, backgroundColor: c.surface, borderRadius: radius.lg, padding: 18, gap: 14 }}
          >
            <H2>Välj djur för {person.name}</H2>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12 }}>
              {ANIMALS.map((a) => {
                const selected = person.animal === a.key;
                return (
                  <Pressable
                    key={a.key}
                    onPress={() => void pick(a.key)}
                    accessibilityRole="button"
                    accessibilityLabel={a.name}
                    accessibilityState={{ selected }}
                    style={{ width: '25%', alignItems: 'center', gap: 4 }}
                  >
                    <View
                      style={{
                        borderRadius: radius.pill,
                        padding: 3,
                        borderWidth: 2,
                        borderColor: selected ? c.accent : 'transparent',
                      }}
                    >
                      <Avatar person={{ name: person.name, color: person.color, animal: a.key }} size={54} />
                    </View>
                    <Text style={{ color: selected ? c.accentText : c.muted, fontSize: 13, fontWeight: selected ? '700' : '500' }}>{a.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <Button label="Visa initialer i stället" variant="ghost" onPress={() => void pick(null)} />
              <Button label="Stäng" variant="ghost" onPress={() => setOpen(false)} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
