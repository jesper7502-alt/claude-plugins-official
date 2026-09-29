import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useStore } from '../lib/store';
import { radius, useColors } from '../lib/theme';

/** Kort besked längst ner, med Ångra när det finns något att ångra. */
export function Toast() {
  const { toast, hideToast } = useStore();
  const c = useColors();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(hideToast, 5000);
    return () => clearTimeout(t);
  }, [toast, hideToast]);

  if (!toast) return null;
  return (
    <View style={{ pointerEvents: 'box-none', position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 72, alignItems: 'center' }}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          backgroundColor: c.ink,
          borderRadius: radius.md,
          paddingVertical: 10,
          paddingLeft: 16,
          paddingRight: 10,
          maxWidth: 480,
          boxShadow: '0 6px 24px rgba(31, 42, 68, 0.25)',
        }}
      >
        <Text numberOfLines={2} style={{ color: c.bg, flexShrink: 1, fontSize: 15 }}>{toast.text}</Text>
        {toast.undo ? (
          <Pressable
            onPress={() => {
              toast.undo?.();
              hideToast();
            }}
            accessibilityRole="button"
            style={{ borderWidth: 1, borderColor: c.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: c.bg, fontWeight: '700' }}>Ångra</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
