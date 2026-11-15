import React, { useEffect, useState } from 'react';
import {
  Alert, AppState, FlatList, Pressable, StyleSheet, Text, View,
} from 'react-native';
import { useApp } from '../context/AppContext';
import { CareButton, care } from '../components/CareUI';
import { todayDoses } from '../utils/domain';

export default function Today({ navigation }) {
  const { medicines, records, busy, markDose, undoDose } = useApp();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') setNow(new Date());
    });
    return () => { clearInterval(timer); sub.remove(); };
  }, []);

  const doses = todayDoses(medicines, records, now);
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const upcoming = doses.find(d => !d.record && d.time >= currentTime);
  const highlighted = upcoming || doses.find(d => !d.record);
  const taken = doses.filter(d => d.record?.status === 'taken').length;
  const pending = doses.filter(d => !d.record).length;

  async function run(action) {
    try { await action(); }
    catch (e) { Alert.alert('Não foi possível concluir', e.message); }
  }

  function skip(dose) {
    Alert.alert('Registrar dose pulada?', 'Esse registro atualiza seu histórico.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Registrar', onPress: () => run(() => markDose(dose, 'skipped')) },
    ]);
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={doses}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.date}>
              {now.toLocaleDateString('pt-BR', {
                weekday: 'long', day: 'numeric', month: 'long',
              })}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              Hoje, no seu ritmo
            </Text>
            <Text style={styles.subtitle}>
              Seu cuidado, um horário de cada vez.
            </Text>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Medicamentos do dia     </Text>
              {!!doses.length && (
                <Text style={styles.count}>{taken}/{doses.length} tomadas</Text>
              )}
            </View>
            {!!doses.length && !pending && (
              <Text style={styles.finished}>
                Todos os horários de hoje foram registrados.
              </Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✚</Text>
            <Text style={styles.emptyTitle}>Seu cuidado começa por aqui      </Text>
            <Text style={styles.emptyText}>
              Os horários aparecerão aqui depois que você fizer o cadastro
              na aba Medicamentos.
            </Text>
          </View>
        }
        renderItem={({ item: dose }) => {
          const featured = highlighted?.key === dose.key;
          return (
            <View style={[styles.card, featured && styles.featured]}>
              {featured && (
                <Text style={styles.badge}>
                  {upcoming ? 'PRÓXIMO HORÁRIO' : 'PARA REGISTRAR'}
                </Text>
              )}
              <View style={styles.cardTop}>
                <View style={styles.timeBlock}>
                  <Text style={styles.time}>{dose.time}</Text>
                  <Text style={styles.timeLabel}>horário</Text>
                </View>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{dose.med.name}</Text>
                  <Text style={styles.dose}>{dose.med.dose}</Text>
                </View>
              </View>
              {dose.record ? (
                <View style={styles.registered}>
                  <Text style={styles.status}>
                    {dose.record.status === 'taken' ? '✓ Tomada' : 'Dose pulada'}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Desfazer registro de ${dose.med.name} às ${dose.time}`}
                    disabled={busy}
                    onPress={() => run(() => undoDose(dose.key))}
                    style={styles.undo}
                  >
                    <Text style={styles.undoText}>Desfazer</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <CareButton
                    title="Tomei"
                    disabled={busy}
                    onPress={() => run(() => markDose(dose, 'taken'))}
                    style={{ flex: 1 }}
                  />
                  <CareButton
                    secondary title="Pular" disabled={busy}
                    onPress={() => skip(dose)}
                  />
                </View>
              )}
            </View>
          );
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Registrar como estou. Abrir diário de monitoramento"
        onPress={() => navigation.navigate('Diário')}
        style={({ pressed }) => [styles.floating, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.floatingIcon}>＋</Text>
        <Text style={styles.floatingText}>Como estou?   </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: care.bg },
  list: { padding: 22, paddingBottom: 130, flexGrow: 1 },
  header: { marginBottom: 12 },
  date: { color: care.muted, fontSize: 14, marginBottom: 10 },
  title: {
    color: care.ink, fontSize: 31, fontWeight: '800', marginBottom: 8,
  },
  subtitle: { color: care.muted, fontSize: 15, lineHeight: 22 },
  sectionHeading: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', gap: 8, marginTop: 32, marginBottom: 8,
  },
  sectionTitle: { fontSize: 19, fontWeight: '700', color: care.ink },
  count: { color: care.accent, fontSize: 13, fontWeight: '600' },
  finished: { color: care.muted, lineHeight: 21, marginBottom: 8 },
  card: {
    backgroundColor: care.white, padding: 20, borderRadius: 25,
    marginBottom: 14, borderWidth: 1, borderColor: care.border,
  },
  featured: { backgroundColor: care.pale, borderColor: '#CCB9DF' },
  badge: {
    color: care.accent, fontSize: 10, letterSpacing: 1.3,
    fontWeight: '800', marginBottom: 15,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 17 },
  timeBlock: { flexShrink: 0, minWidth: 92 },
  time: { fontSize: 30, fontWeight: '700', color: care.ink },
  timeLabel: { color: care.muted, fontSize: 12, marginTop: 2 },
  medicineInfo: { flex: 1 },
  medicineName: {
    color: care.ink, fontSize: 20, fontWeight: '700', marginBottom: 5,
  },
  dose: { color: care.muted, fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  registered: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    flexWrap: 'wrap', marginTop: 12, gap: 4,
  },
  status: { color: care.accent, fontWeight: '600', fontSize: 14 },
  undo: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 },
  undoText: {
    color: care.muted, textDecorationLine: 'underline', fontSize: 13,
  },
  empty: {
    backgroundColor: care.white, borderRadius: 25, padding: 28,
    alignItems: 'center', marginTop: 8,
  },
  emptyIcon: { color: care.accent, fontSize: 36, marginBottom: 15 },
  emptyTitle: {
    color: care.ink, fontSize: 20, textAlign: 'center', fontWeight: '700',
  },
  emptyText: {
    color: care.muted, textAlign: 'center', lineHeight: 23, marginTop: 10,
  },
  floating: {
    position: 'absolute', right: 22, bottom: 20, borderRadius: 30,
    backgroundColor: care.accent, paddingVertical: 15, paddingHorizontal: 21,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    elevation: 6, shadowColor: '#352B42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 8,
  },
  floatingIcon: { color: 'white', fontSize: 24 },
  floatingText: { color: 'white', fontWeight: '700', fontSize: 15 },
});
