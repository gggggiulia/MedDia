import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  cancelNotifications,
  scheduleMedicine,
  scheduleSnooze,
} from "../services/notifications";
import { addMinutesToTime, dayKey, doseKey, uid } from "../utils/domain";

const KEY = "@meddia/v1";
const initial = { medicines: [], records: [], entries: [], snoozed: {} };
const Context = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(initial);
  const current = useRef(initial);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState("");

  async function load() {
    setLoadError("");

    try {
      const raw = await AsyncStorage.getItem(KEY);
      const parsed = raw ? JSON.parse(raw) : initial;

      if (
        !Array.isArray(parsed.medicines) ||
        !Array.isArray(parsed.records) ||
        !Array.isArray(parsed.entries)
      ) {
        throw new Error("Dados inválidos");
      }

      const saved = {
        ...initial,
        ...parsed,
        snoozed: parsed.snoozed && typeof parsed.snoozed === "object" ? parsed.snoozed : {},
      };

      current.current = saved;
      setData(saved);
      setReady(true);
    } catch {
      setLoadError(
        "Não foi possível ler os dados salvos. Tente novamente; seus dados não serão substituídos."
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function commit(next) {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    current.current = next;
    setData(next);
  }

  async function exclusive(action) {
    if (locked.current) {
      throw new Error("Aguarde a operação atual terminar.");
    }

    locked.current = true;
    setBusy(true);

    try {
      return await action();
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }

  const saveMedicine = (values) =>
    exclusive(async () => {
      const old = current.current.medicines.find((m) => m.id === values.id);
      const now = new Date();
      const nowTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;

      const med = {
        ...values,
        id: old?.id || uid(),
        createdAt: old?.createdAt || now.toISOString(),
        createdDay: old?.createdDay || dayKey(now),
        skipBeforeToday: old ? old.skipBeforeToday ?? null : nowTime,
        notificationIds: [],
      };

      let warning = "";

      if (med.reminders) {
        try {
          med.notificationIds = await scheduleMedicine(med);
        } catch (e) {
          med.reminders = false;
          warning = `Medicamento salvo, mas os lembretes ficaram desligados. ${e.message}`;
        }
      }

      try {
        await cancelNotifications(old?.notificationIds);

        await commit({
          ...current.current,
          medicines: old
            ? current.current.medicines.map((m) => (m.id === med.id ? med : m))
            : [...current.current.medicines, med],
        });
      } catch {
        await cancelNotifications(med.notificationIds);

        if (old?.reminders) {
          try {
            const ids = await scheduleMedicine(old);

            await commit({
              ...current.current,
              medicines: current.current.medicines.map((m) =>
                m.id === old.id ? { ...m, notificationIds: ids } : m
              ),
            });
          } catch {
            // O erro abaixo orienta a conferir o cadastro e os lembretes.
          }
        }

        throw new Error(
          "Não foi possível salvar. Confira o cadastro e os lembretes e tente novamente."
        );
      }

      return warning;
    });

  const deleteMedicine = (id) =>
    exclusive(async () => {
      const old = current.current.medicines.find((m) => m.id === id);
      await cancelNotifications(old?.notificationIds);

      await commit({
        ...current.current,
        medicines: current.current.medicines.filter((m) => m.id !== id),
      });
    });

  const restockMedicine = (id, amount) =>
    exclusive(async () => {
      const medicines = current.current.medicines.map((m) => {
        if (m.id !== id) return m;
        const currentStock = typeof m.stock === "number" ? m.stock : 0;
        return { ...m, stock: currentStock + amount };
      });

      await commit({ ...current.current, medicines });
    });

  const snoozeDose = (dose, minutes, cascade = false) =>
    exclusive(async () => {
      const nextSnoozed = { ...current.current.snoozed };
      const newPrimaryTime = addMinutesToTime(dose.time, minutes);

      nextSnoozed[dose.key] = {
        time: newPrimaryTime,
        cascade: !!cascade,
      };

      if (dose.med.reminders) {
        await scheduleSnooze(dose.med, minutes, newPrimaryTime);
      }

      await commit({
        ...current.current,
        snoozed: nextSnoozed,
      });
    });

  const markDose = (dose, status) =>
    exclusive(async () => {
      const now = new Date();
      const takenTime = `${String(now.getHours()).padStart(2, "0")}:${String(
        now.getMinutes()
      ).padStart(2, "0")}`;
      const day = dayKey(now);

      const prevRecord = current.current.records.find(
        (r) => r.key === dose.key
      );

      let medicines = current.current.medicines;
      let finishedStockMed = null;

      if (status === "taken" && prevRecord?.status !== "taken") {
        medicines = medicines.map((m) => {
          if (m.id !== dose.med.id || typeof m.stock !== "number") return m;
          const nextStock = Math.max(0, m.stock - 1);
          const updated = { ...m, stock: nextStock };
          if (m.durationType === "until_stock" && nextStock === 0) {
            finishedStockMed = updated;
          }
          return updated;
        });
      }

      // Se o tratamento era "até acabar o estoque" e chegou a 0, cancela lembretes futuros
      if (finishedStockMed?.notificationIds?.length) {
        await cancelNotifications(finishedStockMed.notificationIds);
        medicines = medicines.map((m) =>
          m.id === finishedStockMed.id
            ? { ...m, notificationIds: [], reminders: false }
            : m
        );
      }

      const previousSnoozed = { ...current.current.snoozed };
      const nextSnoozed = { ...current.current.snoozed };
      const currentEntry = nextSnoozed[dose.key];
      const userDisabledCascade =
        typeof currentEntry === "object" &&
        currentEntry !== null &&
        currentEntry.cascade === false;

      const shouldCascade =
        status === "taken" &&
        typeof dose.med.intervalHours === "number" &&
        !userDisabledCascade;

      delete nextSnoozed[dose.key];

      if (shouldCascade) {
        const followingTimes = dose.med.times
          .filter((t) => t > dose.originalTime)
          .sort();

        followingTimes.forEach((t, idx) => {
          const k = doseKey(dose.med.id, day, t);
          const alreadyRecorded = current.current.records.some(
            (r) => r.key === k
          );
          if (!alreadyRecorded) {
            const offsetMinutes = (idx + 1) * dose.med.intervalHours * 60;
            const recalculatedTime = addMinutesToTime(takenTime, offsetMinutes);

            if (recalculatedTime !== t) {
              nextSnoozed[k] = {
                time: recalculatedTime,
                cascade: true,
              };
            } else {
              delete nextSnoozed[k];
            }
          }
        });
      }

      const record = {
        key: dose.key,
        id: uid(),
        medicineId: dose.med.id,
        medicineName: dose.med.name,
        dose: dose.med.dose,
        scheduledTime: dose.time,
        takenAtTime: status === "taken" ? takenTime : null,
        status,
        at: now.toISOString(),
        previousSnoozed,
      };

      await commit({
        ...current.current,
        medicines,
        snoozed: nextSnoozed,
        records: [
          ...current.current.records.filter((r) => r.key !== dose.key),
          record,
        ],
      });
    });

  const undoDose = (key) =>
    exclusive(async () => {
      const prevRecord = current.current.records.find((r) => r.key === key);

      let medicines = current.current.medicines;
      if (prevRecord?.status === "taken") {
        medicines = medicines.map((m) => {
          if (m.id !== prevRecord.medicineId || typeof m.stock !== "number") {
            return m;
          }
          return { ...m, stock: m.stock + 1 };
        });
      }

      const restoredSnoozed = prevRecord?.previousSnoozed
        ? prevRecord.previousSnoozed
        : current.current.snoozed;

      await commit({
        ...current.current,
        medicines,
        snoozed: restoredSnoozed,
        records: current.current.records.filter((r) => r.key !== key),
      });
    });

  const addEntry = (values) =>
    exclusive(() =>
      commit({
        ...current.current,
        entries: [
          { ...values, id: uid(), at: new Date().toISOString() },
          ...current.current.entries,
        ],
      })
    );

  const deleteEntry = (id) =>
    exclusive(() =>
      commit({
        ...current.current,
        entries: current.current.entries.filter((e) => e.id !== id),
      })
    );

    const deleteRecord = (id) =>
    exclusive(() =>
      commit({
        ...current.current,
        records: current.current.records.filter((r) => r.id !== id),
      })
    );

  const clearHistory = (olderThanDays = null) =>
    exclusive(() => {
      if (!olderThanDays) {
        return commit({
          ...current.current,
          records: [],
          entries: [],
        });
      }

      const limit = new Date();
      limit.setDate(limit.getDate() - olderThanDays);
      const limitIso = limit.toISOString();

      return commit({
        ...current.current,
        records: current.current.records.filter((r) => r.at >= limitIso),
        entries: current.current.entries.filter((e) => e.at >= limitIso),
      });
    });

  return (
    <Context.Provider
      value={{
        ...data,
        ready,
        busy,
        loadError,
        retryLoad: load,
        saveMedicine,
        deleteMedicine,
        restockMedicine,
        snoozeDose,
        markDose,
        undoDose,
        addEntry,
        deleteEntry,
        deleteRecord,
        clearHistory
      }}
    >
      {children}
    </Context.Provider>
  );
}

export const useApp = () => useContext(Context);