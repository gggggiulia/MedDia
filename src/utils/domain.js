export const uid = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function addDaysToDayKey(startDay, daysToAdd) {
  const [y, m, d] = startDay.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + daysToAdd);
  return dayKey(dt);
}

export function formatDayKeyBR(dayStr) {
  if (!dayStr) return "";
  const [y, m, d] = dayStr.split("-");
  return `${d}/${m}/${y}`;
}

export const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

export function formatTimeInput(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function addMinutesToTime(time, minutesToAdd) {
  const [h, m] = time.split(":").map(Number);
  const total = (((h * 60 + m + minutesToAdd) % 1440) + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function generateIntervalTimes(startTime, intervalHours) {
  if (!validTime(startTime)) {
    throw new Error("Informe o horário inicial no formato HH:MM (ex.: 08:00).");
  }
  const step = Number(intervalHours);
  if (!step || step < 1 || step > 24) {
    throw new Error("Escolha um intervalo válido em horas.");
  }

  const count = Math.floor(24 / step);
  const times = [];
  for (let i = 0; i < count; i++) {
    times.push(addMinutesToTime(startTime, i * step * 60));
  }
  return Array.from(new Set(times)).sort();
}

export function parseTimes(text) {
  const times = text.split(",").map((t) => t.trim());

  if (!times.length || times.some((t) => !validTime(t))) {
    throw new Error("Use horários no formato 08:00, 14:00, 20:00.");
  }

  if (new Set(times).size !== times.length) {
    throw new Error("Remova os horários repetidos.");
  }

  return times.sort();
}

export const doseKey = (id, day, time) => `${id}|${day}|${time}`;

export function isMedicineFinished(med, date = new Date()) {
  const today = dayKey(date);
  const mode = med.durationType || "continuous";

  if (mode === "days" || mode === "until_date") {
    if (med.endDate && today > med.endDate) return true;
  }

  if (mode === "until_stock") {
    if (typeof med.stock === "number" && med.stock <= 0) return true;
  }

  return false;
}

export function todayDoses(medicines, records, date = new Date(), snoozed = {}) {
  const day = dayKey(date);

  return medicines
    .flatMap((med) => {
      const mode = med.durationType || "continuous";

      // Não exibe antes da data de início ou após a data final do tratamento
      if (med.startDate && day < med.startDate) return [];
      if ((mode === "days" || mode === "until_date") && med.endDate && day > med.endDate) {
        return [];
      }

      const outOfStockStop =
        mode === "until_stock" && typeof med.stock === "number" && med.stock <= 0;

      return med.times
        .filter((originalTime) => {
          if (med.createdDay === day && med.skipBeforeToday) {
            return originalTime >= med.skipBeforeToday;
          }
          return true;
        })
        .map((originalTime) => {
          const key = doseKey(med.id, day, originalTime);
          const record = records.find((r) => r.key === key);

          // Se acabou o estoque no modo "até acabar o estoque", mantém apenas doses já registradas hoje
          if (outOfStockStop && !record) return null;

          const entry = snoozed[key];
          const snoozedTime =
            typeof entry === "string" ? entry : entry?.time || null;
          const snoozedCascade =
            typeof entry === "object" && entry !== null ? !!entry.cascade : false;

          return {
            key,
            med,
            originalTime,
            time: snoozedTime || originalTime,
            snoozedTime,
            snoozedCascade,
            record,
          };
        })
        .filter(Boolean);
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function getWeeklySummary(records, entries) {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const limitIso = sevenDaysAgo.toISOString();

  const recentRecords = records.filter((r) => r.at >= limitIso);
  const recentEntries = entries.filter((e) => e.at >= limitIso);

  const totalDoses = recentRecords.length;
  const takenDoses = recentRecords.filter((r) => r.status === "taken").length;
  const adherenceRate =
    totalDoses > 0 ? Math.round((takenDoses / totalDoses) * 100) : null;

  const moodCounts = {};
  recentEntries.forEach((e) => {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  });
  const topMood =
    Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const symptomCounts = {};
  recentEntries.forEach((e) => {
    if (e.symptoms) {
      e.symptoms.split(", ").forEach((sym) => {
        if (sym && sym !== "Não percebi sintomas") {
          symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
        }
      });
    }
  });
  const topSymptom =
    Object.entries(symptomCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalDoses,
    takenDoses,
    adherenceRate,
    topMood: topMood ? Number(topMood) : null,
    topSymptom,
  };
}

export const formatDate = (value) =>
  new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });