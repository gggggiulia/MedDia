import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export const care = {
  bg: '#FAF8FC', ink: '#352B42', muted: '#796F85',
  accent: '#755395', pale: '#EEE6F5', border: '#E8E1ED',
  rose: '#F8E6EB', white: '#FFFFFF', danger: '#A63838',
};

export function CareButton({ title, onPress, secondary, disabled, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button, secondary && styles.secondary, style,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      <Text style={[styles.buttonText, secondary && { color: care.accent }]}>
        {title}
      </Text>
    </Pressable>
  );
}

export function Choice({ label, emoji, selected, onPress, radio, disabled }) {
  return (
    <Pressable
      accessibilityRole={radio ? 'radio' : 'checkbox'}
      accessibilityState={{ checked: selected, disabled: !!disabled }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.selected,
        pressed && { opacity: 0.65 },
      ]}
    >
      {emoji && <Text style={styles.emoji}>{emoji}</Text>}
      <Text style={[styles.choiceText, selected && { color: care.accent }]}>
        {label}
      </Text>
      {selected && <Text style={styles.check}>✓</Text>}
    </Pressable>
  );
}

export function Section({ title, subtitle, children }) {
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      <View style={styles.options}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48, paddingVertical: 13, paddingHorizontal: 20,
    borderRadius: 18, backgroundColor: care.accent,
    justifyContent: 'center', alignItems: 'center',
  },
  secondary: { backgroundColor: care.pale },
  buttonText: { fontSize: 15, fontWeight: '700', color: 'white' },
  choice: {
    minHeight: 78, flexBasis: 105, flexGrow: 1,
    paddingVertical: 13, paddingHorizontal: 12, borderRadius: 19,
    backgroundColor: care.white, borderWidth: 2, borderColor: care.border,
    alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  selected: { backgroundColor: care.pale, borderColor: care.accent },
  emoji: { fontSize: 27 },
  choiceText: {
    color: care.ink, textAlign: 'center', fontSize: 14, fontWeight: '600',
  },
  check: { color: care.accent, fontWeight: '800', fontSize: 13 },
  section: { marginBottom: 30 },
  sectionTitle: {
    fontSize: 21, fontWeight: '700', color: care.ink, marginBottom: 7,
  },
  subtitle: { color: care.muted, fontSize: 14, lineHeight: 21, marginBottom: 13 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 5 },
});
