import React, {
  createContext, useContext, useEffect, useRef, useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  cancelNotifications, scheduleMedicine,
} from '../services/notifications';
import { uid } from '../utils/domain';

const KEY = '@meddia/v1';
const initial = { medicines: [], records: [], entries: [] };
const Context = createContext(null);

export function AppProvider({ children }) {
  const [data, setData] = useState(initial);
  const current = useRef(initial);
  const locked = useRef(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState('');

  async function load() {
    setLoadError('');

    try {
      const raw = await AsyncStorage.getItem(KEY);
      const saved = raw ? JSON.parse(raw) : initial;

      if (
        !Array.isArray(saved.medicines) ||
        !Array.isArray(saved.records) ||
        !Array.isArray(saved.entries)
      ) {
        throw new Error('Dados inválidos');
      }

      current.current = saved;
      setData(saved);
      setReady(true);
    } catch {
      setLoadError(
        'Não foi possível ler os dados salvos. Tente novamente; seus dados não serão substituídos.'
      );
    }
  }

  useEffect(() => { load(); }, []);

  async function commit(next) {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
    current.current = next;
    setData(next);
  }

  async function exclusive(action) {
    if (locked.current) {
      throw new Error('Aguarde a operação atual terminar.');
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

  const saveMedicine = values => exclusive(async () => {
    const old = current.current.medicines.find(m => m.id === values.id);

    const med = {
      ...values,
      id: old?.id || uid(),
      createdAt: old?.createdAt || new Date().toISOString(),
      notificationIds: [],
    };

    let warning = '';

    if (med.reminders) {
      try {
        med.notificationIds = await scheduleMedicine(med);
      } catch (e) {
        med.reminders = false;
        warning =
          `Medicamento salvo, mas os lembretes ficaram desligados. ${e.message}`;
      }
    }

    try {
      await cancelNotifications(old?.notificationIds);

      await commit({
        ...current.current,
        medicines: old
          ? current.current.medicines.map(m => m.id === med.id ? med : m)
          : [...current.current.medicines, med],
      });
    } catch {
      await cancelNotifications(med.notificationIds);

      if (old?.reminders) {
        try {
          const ids = await scheduleMedicine(old);

          await commit({
            ...current.current,
            medicines: current.current.medicines.map(m =>
              m.id === old.id ? { ...m, notificationIds: ids } : m
            ),
          });
        } catch {
          // O erro abaixo orienta a conferir o cadastro e os lembretes.
        }
      }

      throw new Error(
        'Não foi possível salvar. Confira o cadastro e os lembretes e tente novamente.'
      );
    }

    return warning;
  });

  const deleteMedicine = id => exclusive(async () => {
    const old = current.current.medicines.find(m => m.id === id);
    await cancelNotifications(old?.notificationIds);

    await commit({
      ...current.current,
      medicines: current.current.medicines.filter(m => m.id !== id),
    });
  });

  const markDose = (dose, status) => exclusive(async () => {
    const record = {
      key: dose.key,
      id: uid(),
      medicineId: dose.med.id,
      medicineName: dose.med.name,
      dose: dose.med.dose,
      scheduledTime: dose.time,
      status,
      at: new Date().toISOString(),
    };

    await commit({
      ...current.current,
      records: [
        ...current.current.records.filter(r => r.key !== dose.key),
        record,
      ],
    });
  });

  const undoDose = key => exclusive(() => commit({
    ...current.current,
    records: current.current.records.filter(r => r.key !== key),
  }));

  const addEntry = values => exclusive(() => commit({
    ...current.current,
    entries: [
      { ...values, id: uid(), at: new Date().toISOString() },
      ...current.current.entries,
    ],
  }));

  const deleteEntry = id => exclusive(() => commit({
    ...current.current,
    entries: current.current.entries.filter(e => e.id !== id),
  }));

  return (
    <Context.Provider value={{
      ...data,
      ready,
      busy,
      loadError,
      retryLoad: load,
      saveMedicine,
      deleteMedicine,
      markDose,
      undoDose,
      addEntry,
      deleteEntry,
    }}>
      {children}
    </Context.Provider>
  );
}

export const useApp = () => useContext(Context);
