import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, useColors } from '../lib/theme';
import type { Person } from '../lib/types';

const initials = (name: string) =>
  (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export function Avatar({ person, size = 24 }: { person?: Pick<Person, 'name' | 'color'>; size?: number }) {
  return (
    <View
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: person?.color ?? '#7A8580',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: size * 0.4 }}>{initials(person?.name ?? '?')}</Text>
    </View>
  );
}

/**
 * Skärm med scroll, sidmarginal och maxbredd för breda webbfönster.
 * `safeTop` används på skärmar utan sidhuvud så att innehållet hamnar under statusraden.
 */
export function Screen({ children, safeTop }: { children: ReactNode; safeTop?: boolean }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: (safeTop ? insets.top : 0) + 12, paddingBottom: insets.bottom + 96 }}
      keyboardShouldPersistTaps="handled"
    >
      <View style={{ width: '100%', maxWidth: 1080, alignSelf: 'center', gap: 16 }}>{children}</View>
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.surface,
          borderColor: c.line,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: 16,
          gap: 12,
          boxShadow: '0 1px 2px rgba(31, 42, 68, 0.04), 0 8px 24px rgba(91, 127, 214, 0.08)',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function H1({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 30, fontWeight: '800', letterSpacing: -0.5 }}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  const c = useColors();
  return <Text accessibilityRole="header" style={{ color: c.ink, fontSize: 19, fontWeight: '700' }}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  const c = useColors();
  return <Text style={[{ color: c.muted, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Label({ children, warn }: { children: ReactNode; warn?: boolean }) {
  const c = useColors();
  return (
    <Text style={{ color: warn ? c.warn : c.muted, fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' }}>
      {children}
    </Text>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  person,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  person?: Person;
}) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      style={({ pressed }) => [
        styles.chip,
        {
          paddingLeft: person ? 4 : 12,
          backgroundColor: selected ? c.accentSoft : c.surface,
          borderColor: selected ? c.accent : c.line,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      {person ? <Avatar person={person} size={24} /> : null}
      <Text style={{ color: selected ? c.accentText : c.ink, fontWeight: '600', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const c = useColors();
  return (
    <View style={[styles.seg, { backgroundColor: c.surface2, borderColor: c.line }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={[styles.segBtn, on && { backgroundColor: c.surface }]}
          >
            <Text style={{ color: on ? c.ink : c.muted, fontWeight: '600', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  const c = useColors();
  const primary = variant === 'primary';
  const color = primary ? c.accentInk : variant === 'danger' ? c.warn : c.muted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        primary
          ? { backgroundColor: c.accent, borderColor: c.accent }
          : { backgroundColor: 'transparent', borderColor: variant === 'danger' ? c.warn : c.line },
        { opacity: disabled ? 0.5 : pressed ? 0.75 : 1 },
        !primary && styles.btnSmall,
      ]}
    >
      <Text style={{ color, fontWeight: '700', fontSize: primary ? 15 : 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: c.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
      <TextInput
        placeholderTextColor={c.muted}
        {...props}
        style={[styles.input, { backgroundColor: c.surface, borderColor: c.line, color: c.ink }]}
      />
    </View>
  );
}

export function Pill({ children, tone = 'plain' }: { children: ReactNode; tone?: 'plain' | 'warn' | 'ok' }) {
  const c = useColors();
  const bg = tone === 'warn' ? c.warnSoft : tone === 'ok' ? c.accentSoft : c.surface;
  const fg = tone === 'warn' ? c.warn : tone === 'ok' ? c.accentText : c.ink;
  return (
    <View style={[styles.pill, { backgroundColor: bg, borderColor: tone === 'plain' ? c.line : bg }]}>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 14 }}>{children}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 12, paddingVertical: 4, minHeight: 34, borderRadius: radius.pill, borderWidth: 1 },
  seg: { flexDirection: 'row', padding: 3, borderRadius: radius.pill, borderWidth: 1, alignSelf: 'flex-start' },
  segBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill },
  btn: { minHeight: 44, paddingHorizontal: 18, borderRadius: radius.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { minHeight: 34, paddingHorizontal: 12, borderRadius: radius.sm },
  input: { minHeight: 44, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 12, fontSize: 16 },
  pill: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1 },
});
