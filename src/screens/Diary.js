import React, { useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "../context/AppContext";
import { care, CareButton, Choice, Section } from "../components/CareUI";
import { moods } from "../theme";

const FEELINGS = [
  ["Tranquilo(a)", "🌿"],
  ["Feliz", "☀️"],
  ["Animado(a)", "✨"],
  ["Ansioso(a)", "🌀"],
  ["Triste", "☁️"],
  ["Irritado(a)", "⚡"],
  ["Sensível", "💧"],
  ["Desmotivado(a)", "💫"],
];

const SYMPTOMS = [
  ["Não percebi sintomas", "🍃"],
  ["Dor de cabeça", "🤕"],
  ["Náusea", "🤢"],
  ["Tontura", "💫"],
  ["Sonolência", "😴"],
  ["Insônia", "🌙"],
  ["Cansaço", "🔋"],
  ["Desconforto abdominal", "〰️"],
  ["Boca seca", "💧"],
  ["Mudança no apetite", "🍽️"],
];

const NONE = "Não percebi sintomas";
const toggle = (items, value) =>
  items.includes(value)
    ? items.filter((item) => item !== value)
    : [...items, value];

export default function Diary({ navigation }) {
  const { medicines, addEntry, busy } = useApp();
  const scrollRef = useRef(null);
  const [mood, setMood] = useState(null);
  const [feelings, setFeelings] = useState([]);
  const [symptoms, setSymptoms] = useState([]);
  const [selected, setSelected] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  function selectSymptom(value) {
    setSymptoms((items) =>
      value === NONE
        ? items.includes(NONE)
          ? []
          : [NONE]
        : toggle(
            items.filter((item) => item !== NONE),
            value
          )
    );
  }

  async function save() {
    if (!mood) {
      setError("Escolha seu humor para salvar o registro.");
      return;
    }

    setError("");

    try {
      await addEntry({
        mood,
        feelings: feelings.join(", "),
        symptoms: symptoms.join(", "),
        notes: notes.trim(),
        medicines: medicines
          .filter((m) => selected.includes(m.id))
          .map((m) => ({ id: m.id, name: m.name })),
      });

      setMood(null);
      setFeelings([]);
      setSymptoms([]);
      setSelected([]);
      setNotes("");

      scrollRef.current?.scrollTo({ y: 0, animated: false });

      try {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      } catch {}

      Alert.alert(
        "Registro salvo!",
        "Seu registro foi adicionado ao Histórico.",
        [
          {
            text: "Ver no Histórico",
            onPress: () => navigation.navigate("Histórico"),
          },
        ]
      );
    } catch {
      setError(
        "Não foi possível salvar. Suas escolhas continuam aqui para tentar novamente."
      );
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>SEU MOMENTO DE PAUSA</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Como estou
          </Text>
          <Text style={styles.subtitle}>
            Toque no que combina com você agora.
          </Text>
        </View>

        <Section title="Meu humor" subtitle="Escolha uma opção.">
          {moods.map((item) => (
            <Choice
              key={item.value}
              label={item.label}
              emoji={item.emoji}
              radio
              selected={mood === item.value}
              disabled={busy}
              onPress={() => {
                setMood(item.value);
                setError("");
              }}
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
              onPress={() => setFeelings((items) => toggle(items, label))}
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
            {medicines.map((item) => (
              <Choice
                key={item.id}
                label={item.name}
                emoji="💊"
                selected={selected.includes(item.id)}
                disabled={busy}
                onPress={() => setSelected((items) => toggle(items, item.id))}
              />
            ))}
          </Section>
        )}

        <Section
          title="Anotações livres"
          subtitle="Opcional. Escreva algo sobre seu sono, alimentação ou rotina."
        >
          <TextInput
            accessibilityLabel="Anotações livres do diário"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
            editable={!busy}
            placeholder="Ex.: Tomei o remédio após o café da manhã..."
            placeholderTextColor={care.muted}
            style={styles.notesInput}
          />
        </Section>

        {!!error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}

        <CareButton
          title={busy ? "Salvando…" : "Salvar meu registro"}
          disabled={busy}
          onPress={save}
        />

        <Text style={styles.footnote}>
          Seu registro fica no Histórico. Ele ajuda a observar padrões, sem
          determinar a causa dos sintomas.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: care.bg },
  content: { padding: 22, paddingBottom: 40 },
  intro: { marginBottom: 16 },
  eyebrow: {
    color: care.accent,
    fontSize: 12,
    letterSpacing: 1.4,
    fontWeight: "700",
  },
  title: {
    color: care.ink,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 10,
    marginBottom: 8,
  },
  subtitle: { color: care.muted, fontSize: 15, lineHeight: 23 },
  notesInput: {
    width: "100%",
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: care.border,
    backgroundColor: care.white,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    color: care.ink,
    textAlignVertical: "top",
  },
  error: { color: care.danger, lineHeight: 22, marginBottom: 14 },
  footnote: {
    color: care.muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 16,
  },
});