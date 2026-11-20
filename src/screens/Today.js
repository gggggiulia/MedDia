import React, { useEffect, useState } from "react";
import {
  Alert,
  AppState,
  FlatList,
  Modal,
  Platform,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "../context/AppContext";
import { CareButton, care } from "../components/CareUI";
import { colors } from "../theme";
import { todayDoses } from "../utils/domain";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function getGreeting(hour) {
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export default function Today({ navigation }) {
  const { medicines, records, snoozed, busy, markDose, undoDose, snoozeDose } =
    useApp();
  const [now, setNow] = useState(new Date());
  const [snoozeTarget, setSnoozeTarget] = useState(null);
  const [cascadeNext, setCascadeNext] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);

  const doses = todayDoses(medicines, records, now, snoozed);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  const upcoming = doses.find((d) => !d.record && d.time >= currentTime);
  const highlighted = upcoming || doses.find((d) => !d.record);
  const taken = doses.filter((d) => d.record?.status === "taken").length;
  const pending = doses.filter((d) => !d.record).length;
  const progressPct =
    doses.length > 0 ? Math.round((taken / doses.length) * 100) : 0;

  async function run(action, withHaptic = false) {
    try {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      await action();
      if (withHaptic) {
        try {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          );
        } catch {}
      }
    } catch (e) {
      Alert.alert("Não foi possível concluir", e.message);
    }
  }

  function skip(dose) {
    Alert.alert(
      "Registrar dose pulada?",
      "Esse registro atualiza seu histórico.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Registrar",
          onPress: () => run(() => markDose(dose, "skipped")),
        },
      ]
    );
  }

  function openSnooze(dose) {
    setSnoozeTarget(dose);
    setCascadeNext(!!dose.med.intervalHours);
  }

  async function confirmSnooze(minutes) {
    if (!snoozeTarget) return;
    const target = snoozeTarget;
    setSnoozeTarget(null);
    await run(() => snoozeDose(target, minutes, cascadeNext), true);
  }

  const hasFollowingDoses =
    snoozeTarget &&
    doses.some(
      (d) =>
        d.med.id === snoozeTarget.med.id &&
        d.originalTime > snoozeTarget.originalTime &&
        !d.record
    );

  return (
    <View style={styles.root}>
      <FlatList
        data={doses}
        keyExtractor={(item) => item.key}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.date}>
              {getGreeting(now.getHours())} •{" "}
              {now.toLocaleDateString("pt-BR", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </Text>
            <Text accessibilityRole="header" style={styles.title}>
              Hoje, no seu ritmo
            </Text>
            <Text style={styles.subtitle}>
              Seu cuidado, um horário de cada vez.
            </Text>

            {!!doses.length && (
              <View style={styles.progressBox}>
                <View style={styles.progressHeader}>
                  <Text style={styles.sectionTitle}>Medicamentos do dia</Text>
                  <Text style={styles.count}>
                    {taken}/{doses.length} tomadas ({progressPct}%)
                  </Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${progressPct}%` }]}
                  />
                </View>
              </View>
            )}

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
            <Text style={styles.emptyTitle}>Seu cuidado começa por aqui</Text>
            <Text style={styles.emptyText}>
              Cadastre seu primeiro medicamento com horários ou intervalo para
              acompanhar tudo por aqui.
            </Text>
            <CareButton
              title="+ Cadastrar medicamento"
              onPress={() =>
                navigation.navigate("Medicamentos", { screen: "MedicineForm" })
              }
              style={{ marginTop: 18, alignSelf: "stretch" }}
            />
          </View>
        }
        renderItem={({ item: dose }) => {
          const featured = highlighted?.key === dose.key;
          const isOverdue = !dose.record && dose.time < currentTime;
          const hasStock = typeof dose.med.stock === "number";
          const alertLimit = dose.med.lowStockAlert ?? 5;
          const isLowStock = hasStock && dose.med.stock <= alertLimit;

          return (
            <View style={[styles.card, featured && styles.featured]}>
              {featured && (
                <Text style={styles.badge}>
                  {upcoming ? "PRÓXIMO HORÁRIO" : "PARA REGISTRAR"}
                </Text>
              )}

              {!!dose.snoozedTime && !dose.record && (
                <Text style={styles.snoozeTag}>
                  ⏰ Horário ajustado (original: {dose.originalTime})
                </Text>
              )}

              <View style={styles.cardTop}>
                <View style={styles.timeBlock}>
                  <Text
                    style={[styles.time, isOverdue && { color: colors.warning }]}
                  >
                    {dose.time}
                  </Text>
                  <Text style={styles.timeLabel}>
                    {isOverdue ? "horário passou" : "horário"}
                  </Text>
                </View>
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{dose.med.name}</Text>
                  <Text style={styles.dose}>{dose.med.dose}</Text>
                  {!!dose.med.notes && (
                    <Text style={styles.notes}>{dose.med.notes}</Text>
                  )}
                </View>
              </View>

              {isLowStock && (
                <View
                  style={[
                    styles.stockAlert,
                    dose.med.stock === 0 && styles.stockEmpty,
                  ]}
                >
                  <Text
                    style={[
                      styles.stockAlertText,
                      dose.med.stock === 0 && styles.stockEmptyText,
                    ]}
                  >
                    {dose.med.stock === 0
                      ? "⚠️ Estoque zerado! Lembre-se de repor."
                      : `⚠️ Estoque baixo: restam ${dose.med.stock} ${
                          dose.med.stock === 1 ? "unidade" : "unidades"
                        }`}
                  </Text>
                </View>
              )}

              {dose.record ? (
                <View style={styles.registered}>
                  <Text style={styles.status}>
                    {dose.record.status === "taken"
                      ? "✓ Tomada"
                      : "Dose pulada"}
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
                    onPress={() => run(() => markDose(dose, "taken"), true)}
                    style={{ flex: 1.3 }}
                  />
                  <CareButton
                    secondary
                    title="Adiar"
                    disabled={busy}
                    onPress={() => openSnooze(dose)}
                  />
                  <CareButton
                    secondary
                    title="Pular"
                    disabled={busy}
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
        onPress={() => navigation.navigate("Diário")}
        style={({ pressed }) => [styles.floating, pressed && { opacity: 0.8 }]}
      >
        <Text style={styles.floatingIcon}>＋</Text>
        <Text style={styles.floatingText}>Como estou? </Text>
      </Pressable>

      <Modal
        visible={!!snoozeTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setSnoozeTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              Adiar {snoozeTarget?.med.name}
            </Text>
            <Text style={styles.modalSubtitle}>
              Horário atual: {snoozeTarget?.time}. Por quanto tempo deseja
              adiar?
            </Text>

            {hasFollowingDoses && (
              <Pressable
                onPress={() => setCascadeNext((v) => !v)}
                style={styles.cascadeBox}
              >
                <Text style={styles.cascadeTitle}>
                  {cascadeNext ? "☑️" : "⬜"} Recalcular próximas doses ao tomar
                </Text>
                <Text style={styles.cascadeHint}>
                  Quando você clicar em "Tomei", as doses seguintes de hoje
                  serão ajustadas a partir da hora real tomada (+
                  {snoozeTarget?.med.intervalHours}h).
                </Text>
              </Pressable>
            )}

            <View style={{ gap: 10, marginTop: 14 }}>
              <CareButton
                title="Adiar 15 minutos"
                onPress={() => confirmSnooze(15)}
              />
              <CareButton
                title="Adiar 30 minutos"
                onPress={() => confirmSnooze(30)}
              />
              <CareButton
                title="Adiar 1 hora"
                onPress={() => confirmSnooze(60)}
              />
              <CareButton
                secondary
                title="Cancelar"
                onPress={() => setSnoozeTarget(null)}
              />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: care.bg },
  list: { padding: 22, paddingBottom: 130, flexGrow: 1 },
  header: { marginBottom: 12 },
  date: { color: care.muted, fontSize: 14, marginBottom: 10 },
  title: {
    color: care.ink,
    fontSize: 31,
    fontWeight: "800",
    marginBottom: 8,
  },
  subtitle: { color: care.muted, fontSize: 15, lineHeight: 22 },
  progressBox: {
    marginTop: 24,
    marginBottom: 8,
    backgroundColor: care.white,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: care.border,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 17, fontWeight: "700", color: care.ink },
  count: { color: care.accent, fontSize: 13, fontWeight: "700" },
  progressTrack: {
    height: 8,
    borderRadius: 99,
    backgroundColor: care.pale,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: care.accent,
  },
  finished: { color: care.muted, lineHeight: 21, marginBottom: 8 },
  card: {
    backgroundColor: care.white,
    padding: 20,
    borderRadius: 25,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: care.border,
  },
  featured: { backgroundColor: care.pale, borderColor: "#CCB9DF" },
  badge: {
    color: care.accent,
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: "800",
    marginBottom: 10,
  },
  snoozeTag: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 10,
  },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 17 },
  timeBlock: { flexShrink: 0, minWidth: 92 },
  time: { fontSize: 30, fontWeight: "700", color: care.ink },
  timeLabel: { color: care.muted, fontSize: 12, marginTop: 2 },
  medicineInfo: { flex: 1 },
  medicineName: {
    color: care.ink,
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 5,
  },
  dose: { color: care.muted, fontSize: 14, lineHeight: 21 },
  notes: {
    color: care.accent,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 4,
  },
  stockAlert: {
    marginTop: 14,
    backgroundColor: colors.warningPale,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  stockEmpty: {
    backgroundColor: colors.dangerPale,
  },
  stockAlertText: {
    color: colors.warning,
    fontSize: 13,
    fontWeight: "700",
  },
  stockEmptyText: {
    color: colors.danger,
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 20 },
  registered: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 4,
  },
  status: { color: care.accent, fontWeight: "600", fontSize: 14 },
  undo: { minHeight: 44, justifyContent: "center", paddingHorizontal: 10 },
  undoText: {
    color: care.muted,
    textDecorationLine: "underline",
    fontSize: 13,
  },
  empty: {
    backgroundColor: care.white,
    borderRadius: 25,
    padding: 28,
    alignItems: "center",
    marginTop: 8,
  },
  emptyIcon: { color: care.accent, fontSize: 36, marginBottom: 15 },
  emptyTitle: {
    color: care.ink,
    fontSize: 20,
    textAlign: "center",
    fontWeight: "700",
  },
  emptyText: {
    color: care.muted,
    textAlign: "center",
    lineHeight: 23,
    marginTop: 10,
  },
  floating: {
    position: "absolute",
    right: 22,
    bottom: 20,
    borderRadius: 30,
    backgroundColor: care.accent,
    paddingVertical: 15,
    paddingHorizontal: 21,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    elevation: 6,
    shadowColor: "#352B42",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  floatingIcon: { color: "white", fontSize: 24 },
  floatingText: { color: "white", fontWeight: "700", fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(53, 43, 66, 0.45)",
    justifyContent: "center",
    padding: 22,
  },
  modalCard: {
    backgroundColor: care.white,
    borderRadius: 24,
    padding: 22,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: care.ink,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: care.muted,
    lineHeight: 20,
  },
  cascadeBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 14,
    backgroundColor: care.pale,
  },
  cascadeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: care.ink,
  },
  cascadeHint: {
    fontSize: 12,
    color: care.muted,
    marginTop: 4,
    lineHeight: 17,
  },
});