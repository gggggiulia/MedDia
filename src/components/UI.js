import React from 'react';
import {
  View, Text, Pressable, TextInput, StyleSheet, ScrollView,
} from 'react-native';
import { colors } from '../theme';

export function Button({ title, onPress, secondary, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        (pressed || disabled) && { opacity: 0.55 },
        style,
      ]}
    >
      <Text style={[s.buttonText, secondary && { color: colors.primary }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Card({ children, style }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Heading({ title, subtitle }) {
  return (
    <View style={{ marginBottom: 22 }}>
      <Text style={s.eyebrow}>MEDDIA • SEU CUIDADO DIÁRIO</Text>
      <Text accessibilityRole="header" style={s.heading}>{title}</Text>
      {subtitle && <Text style={s.body}>{subtitle}</Text>}
    </View>
  );
}

export function Empty({ title, text }) {
  return (
    <Card>
      <Text style={s.title}>{title}</Text>
      <Text style={s.body}>{text}</Text>
    </Card>
  );
}

export function Field({ label, ...props }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[
          s.input,
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
        ]}
        {...props}
      />
    </View>
  );
}

export function Page({ children }) {
  return (
    <ScrollView
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.page}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

export const s = StyleSheet.create({
  page: { padding: 20, paddingBottom: 40 },
  heading: {
    fontSize: 30, fontWeight: '800', color: colors.ink, marginVertical: 8,
  },
  eyebrow: {
    fontSize: 11, letterSpacing: 1.5,
    fontWeight: '700', color: colors.primary,
  },
  title: {
    fontSize: 18, fontWeight: '700', color: colors.ink, marginBottom: 6,
  },
  body: { fontSize: 15, lineHeight: 23, color: colors.muted },
  label: {
    fontSize: 14, color: colors.ink, fontWeight: '600', marginBottom: 7,
  },
  card: {
    backgroundColor: colors.card, borderRadius: 20,
    padding: 18, marginBottom: 14,
    borderWidth: 1, borderColor: colors.border,
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap',
  },
  button: {
    minHeight: 48, borderRadius: 13,
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  secondary: { backgroundColor: colors.pale },
  buttonText: {
    flexShrink: 1, color: 'white', fontWeight: '700',
    fontSize: 14, textAlign: 'center',
  },
  input: {
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: 'white', borderRadius: 12,
    padding: 14, fontSize: 16, color: colors.ink,
  },
  chip: {
    padding: 10, borderRadius: 12,
    backgroundColor: colors.pale, marginBottom: 6,
  },
  error: { color: colors.danger, lineHeight: 21, marginBottom: 10 },
});
