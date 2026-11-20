import React, { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useApp } from "../context/AppContext";
import { Button, Card, Field, Heading, Page, s } from "../components/UI";
import {
  addDaysToDayKey,
  dayKey,
  formatDayKeyBR,
  generateIntervalTimes,
} from "../utils/domain";
import { colors } from "../theme";

const INTERVALS = [6, 8, 12, 24];
const DAY_PRESETS = [5, 7, 10, 14];

const QUICK_TIMES = [
  { label: "Manhã", time: "08:00" },
  { label: "Almoço", time: "12:00" },
  { label: "Tarde", time: "16:00" },
  { label: "Noite", time: "20:00" },
  { label: "Dormir", time: "22:00" },
];

function formatDateToHHMM(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function hhmmToDate(hhmm) {
  const [h, m] = (hhmm || "08:00").split(":").map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0, 0, 0);
  return d;
}

function dayKeyToDate(dKey) {
  if (!dKey) return new Date();
  const [y, m, d] = dKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function MedicineForm({ route, navigation }) {
  const { medicines, saveMedicine, busy } = useApp();
  const old = medicines.find((m) => m.id === route.params?.id);

  const [name, setName] = useState(old?.name || "");
  const [dose, setDose] = useState(old?.dose || "");
  const [scheduleMode, setScheduleMode] = useState(
    old?.intervalHours ? "interval" : "fixed"
  );

  // Horários fixos em tags (vazio em novo cadastro)
  const [timeList, setTimeList] = useState(old?.times || []);
  const [timeError, setTimeError] = useState("");
  const [nowTagTime, setNowTagTime] = useState(null);

  // Modo por intervalo (vazio em novo cadastro)
  const [startTime, setStartTime] = useState(old?.times?.[0] || "");
  const [intervalHours, setIntervalHours] = useState(old?.intervalHours || 8);

  // Duração do tratamento
  const [durationType, setDurationType] = useState(
    old?.durationType || "continuous"
  );
  const [durationDays, setDurationDays] = useState(
    old?.durationDays ? String(old.durationDays) : "7"
  );
  const [untilDateKey, setUntilDateKey] = useState(old?.endDate || "");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Controle do relógio nativo do Android/iOS
  const [pickerTarget, setPickerTarget] = useState(null); // "fixed" | "intervalStart" | null
  const [pickerDate, setPickerDate] = useState(new Date());

  const [stock, setStock] = useState(
    typeof old?.stock === "number" ? String(old.stock) : ""
  );
  const [lowStockAlert, setLowStockAlert] = useState(
    typeof old?.lowStockAlert === "number" ? String(old.lowStockAlert) : "5"
  );
  const [notes, setNotes] = useState(old?.notes || "");
  const [reminders, setReminders] = useState(old?.reminders ?? true);
  const [error, setError] = useState("");

  function addTimeTag(formatted) {
    setTimeError("");
    if (timeList.includes(formatted)) {
      setTimeError(`O horário ${formatted} já está na lista.`);
      return false;
    }
    if (timeList.length >= 12) {
      setTimeError("Limite máximo de 12 horários por medicamento.");
      return false;
    }
    setTimeList((prev) => [...prev, formatted].sort());
    return true;
  }

  function toggleNowTime() {
    setTimeError("");
    if (scheduleMode === "interval") {
      if (nowTagTime && startTime === nowTagTime) {
        setStartTime("");
        setNowTagTime(null);
      } else {
        const nowStr = formatDateToHHMM(new Date());
        setStartTime(nowStr);
        setNowTagTime(nowStr);
      }
      return;
    }

    if (nowTagTime && timeList.includes(nowTagTime)) {
      setTimeList((prev) => prev.filter((item) => item !== nowTagTime));
      setNowTagTime(null);
    } else {
      const nowStr = formatDateToHHMM(new Date());
      if (timeList.includes(nowStr)) {
        setNowTagTime(nowStr);
        return;
      }
      if (addTimeTag(nowStr)) {
        setNowTagTime(nowStr);
      }
    }
  }

  function toggleQuickTime(t) {
    setTimeError("");
    if (timeList.includes(t)) {
      setTimeList((prev) => prev.filter((item) => item !== t));
      if (nowTagTime === t) setNowTagTime(null);
    } else {
      addTimeTag(t);
    }
  }

  function removeTime(t) {
    setTimeError("");
    setTimeList((prev) => prev.filter((item) => item !== t));
    if (nowTagTime === t) setNowTagTime(null);
  }

  function openClock(target, baseTimeStr) {
    setTimeError("");
    setPickerDate(baseTimeStr ? hhmmToDate(baseTimeStr) : new Date());
    setPickerTarget(target);
  }

  function onClockChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setPickerTarget(null);
    }
    if (event.type === "dismissed" || !selectedDate) return;

    const chosen = formatDateToHHMM(selectedDate);
    if (pickerTarget === "fixed") {
      addTimeTag(chosen);
    } else if (pickerTarget === "intervalStart") {
      setStartTime(chosen);
      if (nowTagTime && chosen !== nowTagTime) setNowTagTime(null);
    }
  }

  function onCalendarChange(event, selectedDate) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (event.type === "dismissed" || !selectedDate) return;
    setUntilDateKey(dayKey(selectedDate));
  }

  const isNowActive =
    scheduleMode === "interval"
      ? !!nowTagTime && startTime === nowTagTime
      : !!nowTagTime && timeList.includes(nowTagTime);

  let previewTimes = [];
  if (scheduleMode === "interval" && startTime) {
    try {
      previewTimes = generateIntervalTimes(startTime, intervalHours);
    } catch {
      previewTimes = [];
    }
  }

  // Cálculo da prévia de término quando durationType === "days"
  const baseStartDay = old?.startDate || dayKey(new Date());
  const parsedDaysInt = Number(durationDays);
  const previewEndDay =
    durationType === "days" &&
    Number.isInteger(parsedDaysInt) &&
    parsedDaysInt >= 1
      ? addDaysToDayKey(baseStartDay, parsedDaysInt - 1)
      : null;

  async function save() {
    setError("");

    try {
      if (!name.trim() || !dose.trim()) {
        throw new Error("Preencha o nome e a dose do medicamento.");
      }

      if (scheduleMode === "interval" && !startTime) {
        throw new Error("Escolha o horário da 1ª dose do dia.");
      }

      const parsed =
        scheduleMode === "interval"
          ? generateIntervalTimes(startTime, intervalHours)
          : timeList;

      if (!parsed.length) {
        throw new Error("Adicione pelo menos um horário para o medicamento.");
      }

      if (parsed.length > 12) {
        throw new Error("Cadastre até 12 horários por medicamento.");
      }

      let parsedStock = null;
      let parsedAlert = 5;
      let parsedPackSize = old?.packSize ?? null;

      if (stock.trim() !== "") {
        const num = Number(stock.trim());
        if (!Number.isInteger(num) || num < 0 || num > 9999) {
          throw new Error(
            "Informe uma quantidade inteira válida para o estoque (ex.: 28)."
          );
        }
        parsedStock = num;
        if (!parsedPackSize || num > parsedPackSize) {
          parsedPackSize = num;
        }

        if (lowStockAlert.trim() !== "") {
          const alertNum = Number(lowStockAlert.trim());
          if (!Number.isInteger(alertNum) || alertNum < 0 || alertNum > 9999) {
            throw new Error(
              "Informe um número inteiro válido para o alerta de reposição."
            );
          }
          parsedAlert = alertNum;
        }
      }

      // Validação da duração do tratamento
      const todayStr = dayKey(new Date());
      const startDate = old?.startDate || todayStr;
      let finalEndDate = null;
      let finalDurationDays = null;

      if (durationType === "days") {
        const dNum = Number(durationDays.trim());
        if (!Number.isInteger(dNum) || dNum < 1 || dNum > 365) {
          throw new Error("Informe uma quantidade válida de dias (1 a 365).");
        }
        finalDurationDays = dNum;
        finalEndDate = addDaysToDayKey(startDate, dNum - 1);
      } else if (durationType === "until_date") {
        if (!untilDateKey) {
          throw new Error("Escolha a data final do tratamento no calendário.");
        }
        if (untilDateKey < startDate) {
          throw new Error("A data final não pode ser anterior ao início.");
        }
        finalEndDate = untilDateKey;
      } else if (durationType === "until_stock") {
        if (parsedStock === null || parsedStock <= 0) {
          throw new Error(
            "Informe a quantidade em estoque (maior que zero) para usar a opção 'Até acabar o estoque'."
          );
        }
      }

      const warning = await saveMedicine({
        id: old?.id,
        name: name.trim(),
        dose: dose.trim(),
        times: parsed,
        intervalHours: scheduleMode === "interval" ? intervalHours : null,
        durationType,
        durationDays: finalDurationDays,
        startDate,
        endDate: finalEndDate,
        stock: parsedStock,
        packSize: parsedPackSize,
        lowStockAlert: parsedAlert,
        notes: notes.trim(),
        reminders,
      });

      if (warning) Alert.alert("Confira os lembretes", warning);
      navigation.goBack();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Page>
        <Heading
          title={old ? "Editar medicamento" : "Novo medicamento"}
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

        <Text style={s.label}>Como são os horários?</Text>
        <View style={[s.row, { marginBottom: 14 }]}>
          <Button
            secondary={scheduleMode !== "fixed"}
            title="Horários fixos"
            style={{ flex: 1, marginTop: 0 }}
            onPress={() => setScheduleMode("fixed")}
          />
          <Button
            secondary={scheduleMode !== "interval"}
            title="Por intervalo"
            style={{ flex: 1, marginTop: 0 }}
            onPress={() => setScheduleMode("interval")}
          />
        </View>

        {scheduleMode === "fixed" ? (
          <Card>
            <Text style={s.label}>Adicionar horário</Text>
            <Pressable
              onPress={() => openClock("fixed")}
              style={[styles.clockBox, styles.clockBoxEmpty]}
            >
              <Text style={styles.clockBoxPlaceholder}>
                🕒 Selecionar horário no relógio
              </Text>
              <Text style={styles.clockBoxHint}>
                Toque para abrir o relógio ou use uma sugestão abaixo
              </Text>
            </Pressable>

            <Text style={[s.label, { marginTop: 14 }]}>
              Ou use uma sugestão rápida
            </Text>
            <View style={styles.quickGrid}>
              <Pressable
                onPress={toggleNowTime}
                style={[styles.quickChip, isNowActive && styles.quickChipActive]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    isNowActive && styles.quickChipTextActive,
                  ]}
                >
                  ⏱ Agora{isNowActive ? ` • ${nowTagTime}` : ""}
                </Text>
              </Pressable>

              {QUICK_TIMES.map((q) => {
                const active = timeList.includes(q.time);
                return (
                  <Pressable
                    key={q.time}
                    onPress={() => toggleQuickTime(q.time)}
                    style={[
                      styles.quickChip,
                      active && styles.quickChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        active && styles.quickChipTextActive,
                      ]}
                    >
                      {q.label} • {q.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!!timeError && (
              <Text style={[s.error, { marginTop: 8, marginBottom: 0 }]}>
                {timeError}
              </Text>
            )}

            <Text style={[s.label, { marginTop: 16 }]}>
              Horários selecionados ({timeList.length})
            </Text>
            {timeList.length === 0 ? (
              <Text style={s.body}>
                Nenhum horário selecionado. Escolha no relógio ou toque nas
                sugestões acima.
              </Text>
            ) : (
              <View style={styles.selectedGrid}>
                {timeList.map((t) => (
                  <Pressable
                    key={t}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover horário ${t}`}
                    onPress={() => removeTime(t)}
                    style={styles.selectedTag}
                  >
                    <Text style={styles.selectedTagText}>{t} ✕</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </Card>
        ) : (
          <Card>
            <Text style={s.label}>Horário da 1ª dose do dia</Text>
            <Pressable
              onPress={() => openClock("intervalStart", startTime)}
              style={[styles.clockBox, !startTime && styles.clockBoxEmpty]}
            >
              <Text
                style={
                  startTime ? styles.clockBoxTime : styles.clockBoxPlaceholder
                }
              >
                {startTime
                  ? `🕒 ${startTime}`
                  : "🕒 Selecionar horário no relógio"}
              </Text>
              <Text style={styles.clockBoxHint}>
                {startTime
                  ? "Toque para alterar"
                  : "Toque para abrir o relógio ou use uma sugestão abaixo"}
              </Text>
            </Pressable>

            <Text style={[s.label, { marginTop: 14 }]}>
              Ou use uma sugestão rápida
            </Text>
            <View style={[styles.quickGrid, { marginBottom: 14 }]}>
              <Pressable
                onPress={toggleNowTime}
                style={[styles.quickChip, isNowActive && styles.quickChipActive]}
              >
                <Text
                  style={[
                    styles.quickChipText,
                    isNowActive && styles.quickChipTextActive,
                  ]}
                >
                  ⏱ Agora{isNowActive ? ` • ${nowTagTime}` : ""}
                </Text>
              </Pressable>

              {QUICK_TIMES.map((q) => {
                const active = startTime === q.time;
                return (
                  <Pressable
                    key={q.time}
                    onPress={() => {
                      if (startTime === q.time) {
                        setStartTime("");
                      } else {
                        setStartTime(q.time);
                        if (nowTagTime && q.time !== nowTagTime) {
                          setNowTagTime(null);
                        }
                      }
                    }}
                    style={[
                      styles.quickChip,
                      active && styles.quickChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        active && styles.quickChipTextActive,
                      ]}
                    >
                      {q.label} • {q.time}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={s.label}>Repetir a cada:</Text>
            <View style={[s.row, { marginBottom: 12 }]}>
              {INTERVALS.map((h) => (
                <Button
                  key={h}
                  secondary={intervalHours !== h}
                  title={`${h}h`}
                  style={{ flex: 1, marginTop: 0 }}
                  onPress={() => setIntervalHours(h)}
                />
              ))}
            </View>
            {previewTimes.length > 0 && (
              <Text
                style={[s.body, { color: colors.primary, fontWeight: "600" }]}
              >
                Horários calculados: {previewTimes.join(" • ")}
              </Text>
            )}
          </Card>
        )}

        {!!pickerTarget && (
          <DateTimePicker
            value={pickerDate}
            mode="time"
            is24Hour={true}
            themeVariant="light"
            accentColor={colors.primary}
            display={Platform.OS === "android" ? "clock" : "spinner"}
            onChange={onClockChange}
          />
        )}

        <Field
          label="Quantidade em estoque (opcional)"
          value={stock}
          onChangeText={(val) => {
            setStock(val);
            if (val.trim() === "" && durationType === "until_stock") {
              setDurationType("continuous");
            }
          }}
          placeholder="Ex.: 28 (desconta automaticamente ao tomar)"
          keyboardType="number-pad"
          maxLength={4}
        />

        {stock.trim() !== "" && (
          <Field
            label="Avisar reposição quando restar"
            value={lowStockAlert}
            onChangeText={setLowStockAlert}
            placeholder="Ex.: 5"
            keyboardType="number-pad"
            maxLength={4}
          />
        )}

        <Card>
          <Text style={s.label}>Duração do tratamento</Text>
          <View style={styles.quickGrid}>
            {[
              { id: "continuous", label: "Uso contínuo" },
              { id: "days", label: "Por X dias" },
              { id: "until_date", label: "Até uma data" },
              { id: "until_stock", label: "Até acabar o estoque" },
            ].map((opt) => {
              const active = durationType === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    if (opt.id === "until_stock" && stock.trim() === "") {
                      Alert.alert(
                        "Informe o estoque primeiro",
                        "Preencha a 'Quantidade em estoque' acima para encerrar automaticamente quando os comprimidos acabarem."
                      );
                      return;
                    }
                    setDurationType(opt.id);
                  }}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                >
                  <Text
                    style={[
                      styles.quickChipText,
                      active && styles.quickChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {durationType === "days" && (
            <View style={{ marginTop: 14 }}>
              <Text style={s.label}>Sugestões de duração</Text>
              <View style={[styles.quickGrid, { marginBottom: 12 }]}>
                {DAY_PRESETS.map((d) => {
                  const active = durationDays === String(d);
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setDurationDays(String(d))}
                      style={[
                        styles.quickChip,
                        active && styles.quickChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          active && styles.quickChipTextActive,
                        ]}
                      >
                        {d} dias
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Field
                label="Ou digite o número de dias"
                value={durationDays}
                onChangeText={setDurationDays}
                placeholder="Ex.: 7"
                keyboardType="number-pad"
                maxLength={3}
              />

              {!!previewEndDay && (
                <Text
                  style={[s.body, { color: colors.primary, fontWeight: "600" }]}
                >
                  Último dia do tratamento: {formatDayKeyBR(previewEndDay)}
                </Text>
              )}
            </View>
          )}

          {durationType === "until_date" && (
            <View style={{ marginTop: 14 }}>
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={[
                  styles.clockBox,
                  !untilDateKey && styles.clockBoxEmpty,
                ]}
              >
                <Text
                  style={
                    untilDateKey
                      ? styles.clockBoxTime
                      : styles.clockBoxPlaceholder
                  }
                >
                  {untilDateKey
                    ? `📅 Até ${formatDayKeyBR(untilDateKey)}`
                    : "📅 Escolher data final no calendário"}
                </Text>
                <Text style={styles.clockBoxHint}>
                  Toque para selecionar o último dia
                </Text>
              </Pressable>
            </View>
          )}

          {durationType === "until_stock" && (
            <Text style={[s.body, { marginTop: 12, color: colors.primary }]}>
              O tratamento encerrará automaticamente quando as{" "}
              {stock || "0"} unidades do estoque acabarem.
            </Text>
          )}
        </Card>

        {showDatePicker && (
          <DateTimePicker
            value={untilDateKey ? dayKeyToDate(untilDateKey) : new Date()}
            mode="date"
            minimumDate={new Date()}
            themeVariant="light"
            accentColor={colors.primary}
            display="default"
            onChange={onCalendarChange}
          />
        )}

        <Field
          label="Observações (opcional)"
          value={notes}
          onChangeText={setNotes}
          multiline
          maxLength={500}
          placeholder="Orientações que você deseja lembrar"
        />

        <Card>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={s.label}>Lembretes com som</Text>
            <Switch
              accessibilityLabel="Ativar lembretes com som"
              value={reminders}
              onValueChange={setReminders}
              trackColor={{ true: colors.primary }}
            />
          </View>
          <Text style={s.body}>
            Notificações todos os dias nos horários cadastrados. Você poderá
            desligá-las editando este cadastro.
          </Text>
        </Card>

        {!!error && (
          <Text accessibilityRole="alert" style={s.error}>
            {error}
          </Text>
        )}

        <Button
          disabled={busy}
          title={busy ? "Salvando…" : "Salvar medicamento"}
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

const styles = StyleSheet.create({
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: {
    backgroundColor: colors.pale,
    borderColor: colors.primary,
  },
  quickChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.muted,
  },
  quickChipTextActive: {
    color: colors.primary,
  },
  selectedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  selectedTag: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  selectedTagText: {
    color: "white",
    fontWeight: "700",
    fontSize: 14,
  },
  clockBox: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  clockBoxEmpty: {
    borderStyle: "dashed",
  },
  clockBoxTime: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
  },
  clockBoxPlaceholder: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.muted,
  },
  clockBoxHint: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
});