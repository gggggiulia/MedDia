import React, { useState } from 'react';
import {
  Alert, Text, View, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useApp } from '../context/AppContext';
import {
  Button, Card, Field, Heading, Page, s,
} from '../components/UI';
import { parseTimes } from '../utils/domain';
import { colors } from '../theme';

export default function MedicineForm({ route, navigation }) {
  const { medicines, saveMedicine, busy } = useApp();
  const old = medicines.find(m => m.id === route.params?.id);

  const [name, setName] = useState(old?.name || '');
  const [dose, setDose] = useState(old?.dose || '');
  const [times, setTimes] = useState(old?.times.join(', ') || '08:00');
  const [notes, setNotes] = useState(old?.notes || '');
  const [reminders, setReminders] = useState(old?.reminders ?? true);
  const [error, setError] = useState('');

  async function save() {
    setError('');

    try {
      if (!name.trim() || !dose.trim()) {
        throw new Error('Preencha o nome e a dose do medicamento.');
      }

      const parsed = parseTimes(times);

      if (parsed.length > 12) {
        throw new Error('Cadastre até 12 horários por medicamento.');
      }

      const warning = await saveMedicine({
        id: old?.id,
        name: name.trim(),
        dose: dose.trim(),
        times: parsed,
        notes: notes.trim(),
        reminders,
      });

      if (warning) Alert.alert('Confira os lembretes', warning);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Page>
        <Heading
          title={old ? 'Editar medicamento' : 'Novo medicamento'}
          subtitle="Preencha de acordo com a sua prescrição."
        />

        <Field
          label="Nome do medicamento"
          value={name}
          onChangeText={setName}
          maxLength={100}
          placeholder="Ex.: nome na embalagem"
        />

        <Field
          label="Dose por horário"
          value={dose}
          onChangeText={setDose}
          maxLength={100}
          placeholder="Ex.: 1 comprimido de 10 mg"
        />

        <Field
          label="Horários diários (separados por vírgula)"
          value={times}
          onChangeText={setTimes}
          placeholder="08:00, 20:00"
          keyboardType="numbers-and-punctuation"
          maxLength={100}
        />

        <Field
          label="Observações (opcional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
          placeholder="Orientações que você deseja lembrar"
        />

        <Card>
          <View style={[s.row, { justifyContent: 'space-between' }]}>
            <Text style={s.label}>Lembretes com som</Text>
            <Switch
              accessibilityLabel="Ativar lembretes com som"
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Text style={s.body}>
            Notificações todos os dias nos horários cadastrados.
            Você poderá desligá-las editando este cadastro.
          </Text>
        </Card>

        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>{error}</Text>
        )}

        <Button
          disabled={busy}
          title={busy ? 'Salvando…' : 'Salvar medicamento'}
          onPress={save}
        />
        <Button
          secondary
          disabled={busy}
          title="Cancelar"
          onPress={() => navigation.goBack()}
        />
      </Page>
    </KeyboardAvoidingView>
  );
}
