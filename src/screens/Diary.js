import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useApp } from '../context/AppContext';
import { care, CareButton, Choice, Section } from '../components/CareUI';
import { moods } from '../theme';

const FEELINGS = [
  ['Tranquilo(a)', '🌿'], ['Feliz', '☀️'], ['Animado(a)', '✨'],
  ['Ansioso(a)', '🌀'], ['Triste', '☁️'], ['Irritado(a)', '⚡'],
  ['Sensível', '💧'], ['Desmotivado(a)', '🪫'],
];

const SYMPTOMS = [
  ['Não percebi sintomas', '🍃'], ['Dor de cabeça', '🤕'],
  ['Náusea', '🤢'], ['Tontura', '💫'], ['Sonolência', '😴'],
  ['Insônia', '🌙'], ['Cansaço', '🔋'], ['Desconforto abdominal', '〰️'],
  ['Boca seca', '💧'], ['Mudança no apetite', '🍽️'],
];

const NONE = 'Não percebi sintomas';
const toggle = (items, value) => items.includes(value)
  ? items.filter(item => item !== value) : [...items, value];

export default function Diary() {
  const { medicines, addEntry, busy } = useApp();
  const [mood, setMood] = useState(null);
  const [feelings, setFeelings] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');

  function selectSymptom(value) {
    setSymptoms(items => value === NONE
      ? (items.includes(NONE) ? [] : [NONE])
      : toggle(items.filter(item => item !== NONE), value));
  }

  async function save() {
    if (!mood) {
      setError('Escolha seu humor para salvar o registro.');
      return;
    }

    setError('');

    try {
      await addEntry({
        mood,
        feelings: feelings.join(', '),
        symptoms: symptoms.join(', '),
        notes: '',
        medicines: medicines.filter(m => selected.includes(m.id))
          .map(m => ({ id: m.id, name: m.name })),
      });

      setMood(null);
      setFeelings([]);
      setSymptoms([]);
      setSelected([]);

      Alert.alert(
        'Registro salvo',
        'Você pode acompanhar seus registros no Histórico.'
      );
    } catch {
      setError(
        'Não foi possível salvar. Suas escolhas continuam aqui para tentar novamente.'
      );
    }
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.intro}>
        <Text style={styles.eyebrow}>SEU MOMENTO DE PAUSA</Text>
        <Text accessibilityRole="header" style={styles.title}>Como estou</Text>
        <Text style={styles.subtitle}>
          Toque no que combina com você agora.
        </Text>
      </View>

      <Section title="Meu humor" subtitle="Escolha uma opção.">
        {moods.map(item => (
          <Choice
            key={item.value}
            label={item.label}
            emoji={item.emoji}
            radio
            selected={mood === item.value}
            disabled={busy}
            onPress={() => { setMood(item.value); setError(''); }}
          />
        ))}
      </Section>

      <Section
        title="O que estou sentindo"
        subtitle="Você pode marcar mais de uma opção ou deixar em branco."
      >
        {FEELINGS.map(([label, emoji]) => (
          <Choice
            key={label}
            label={label}
            emoji={emoji}
            selected={feelings.includes(label)}
            disabled={busy}
            onPress={() => setFeelings(items => toggle(items, label))}
          />
        ))}
      </Section>

      <Section
        title="No meu corpo"
        subtitle="Percebeu algum destes sintomas? Marque o que se aplica."
      >
        {SYMPTOMS.map(([label, emoji]) => (
          <Choice
            key={label}
            label={label}
            emoji={emoji}
            selected={symptoms.includes(label)}
            disabled={busy}
            onPress={() => selectSymptom(label)}
          />
        ))}
      </Section>

      {!!medicines.length && (
        <Section
          title="Medicamentos em contexto"
          subtitle="Opcional. A seleção não indica a causa do sintoma."
        >
          {medicines.map(item => (
            <Choice
              key={item.id}
              label={item.name}
              emoji="💊"
              selected={selected.includes(item.id)}
              disabled={busy}
              onPress={() => setSelected(items => toggle(items, item.id))}
            />
          ))}
        </Section>
      )}

      {!!error && (
        <Text accessibilityRole="alert" style={styles.error}>{error}</Text>
      )}

      <CareButton
        title={busy ? 'Salvando…' : 'Salvar meu registro'}
        disabled={busy}
        onPress={save}
      />

      <Text style={styles.footnote}>
        Seu registro fica no Histórico. Ele ajuda a observar padrões,
        sem determinar a causa dos sintomas.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: care.bg },
  content: { padding: 22, paddingBottom: 40 },
  intro: { marginBottom: 32 },
  eyebrow: {
    color: care.accent, fontSize: 10, letterSpacing: 1.4, fontWeight: '700',
  },
  title: {
    color: care.ink, fontSize: 34, fontWeight: '800',
    marginTop: 10, marginBottom: 8,
  },
  subtitle: { color: care.muted, fontSize: 15, lineHeight: 23 },
  error: { color: care.danger, lineHeight: 22, marginBottom: 14 },
  footnote: {
    color: care.muted, textAlign: 'center',
    fontSize: 12, lineHeight: 19, marginTop: 18,
  },
});
