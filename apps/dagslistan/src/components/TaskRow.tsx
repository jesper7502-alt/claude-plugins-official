import { useState } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { relativeDay } from '../lib/dates';
import { useColors } from '../lib/theme';
import { REPEAT_LABEL, type Person, type Task } from '../lib/types';

/** En rad i checklistan. Ett tryck bockar av, raden tonar ut och försvinner. */
export function TaskRow({
  task,
  date,
  others,
  showDate,
  onCheck,
}: {
  task: Task;
  date: string;
  others: Person[];
  showDate: boolean;
  /** Resolvar false om avbockningen inte gick att spara; raden visas då igen. */
  onCheck: () => Promise<boolean>;
}) {
  const c = useColors();
  const [checked, setChecked] = useState(false);
  const [fade] = useState(() => new Animated.Value(1));

  const press = () => {
    if (checked) return;
    setChecked(true);
    Animated.timing(fade, { toValue: 0, duration: 260, delay: 120, useNativeDriver: false }).start(async () => {
      if (await onCheck()) return;
      setChecked(false);
      fade.setValue(1);
    });
  };

  const meta: string[] = [];
  if (showDate) meta.push(relativeDay(date));
  if (task.repeat !== 'none') meta.push(`↻ ${REPEAT_LABEL[task.repeat]}`);
  if (others.length) meta.push(`med ${others.map((o) => o.name).join(', ')}`);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateX: fade.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] }}>
      <Pressable
        onPress={press}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`Bocka av ${task.title}`}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 12,
          paddingVertical: 9,
          paddingHorizontal: 6,
          borderRadius: 10,
          backgroundColor: pressed ? c.surface2 : 'transparent',
        })}
      >
        <View
          style={{
            width: 26,
            height: 26,
            borderRadius: 8,
            borderWidth: 2,
            borderColor: checked ? c.accent : c.line,
            backgroundColor: checked ? c.accent : c.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {checked ? <Text style={{ color: c.accentInk, fontWeight: '900', fontSize: 15, lineHeight: 18 }}>✓</Text> : null}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: c.ink, fontSize: 16, fontWeight: '500' }}>{task.title}</Text>
          {meta.length ? <Text style={{ color: c.muted, fontSize: 13 }}>{meta.join('  ·  ')}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}
