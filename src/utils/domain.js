export const uid = () =>
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const dayKey = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export const validTime = (value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

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

export function todayDoses(medicines, records, date = new Date()) {
    const day = dayKey(date);

    return medicines
        .flatMap((med) =>
            med.times.map((time) => ({
                key: doseKey(med.id, day, time),
                med,
                time,
                record: records.find(
                    (r) => r.key === doseKey(med.id, day, time),
                ),
            })),
        )
        .sort((a, b) => a.time.localeCompare(b.time));
}

/* export function getWeeklySummary(records, entries) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const limitIso = sevenDaysAgo.toISOString();

    const recentRecords = records.filter((r) => r.date >= limitIso);
    const recentEntries = entries.filter((e) => e.date >= limitIso);

    
} */

export function getWeeklySummary(records, entries) {
  const totalDoses = records.length;
  const takenDoses = records.filter(r => r.status === 'taken').length;
  const adherenceRate = totalDoses > 0
    ? Math.round((takenDoses / totalDoses) * 100)
    : null;

  const moodCounts = {};
  entries.forEach(e => {
    if (e.mood) {
      moodCounts[e.mood] = (moodCounts[e.mood] || 0) + 1;
    }
  });
  const topMood = Object.entries(moodCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const symptomCounts = {};
  entries.forEach(e => {
    if (e.symptoms) {
      e.symptoms.split(', ').forEach(sym => {
        if (sym && sym !== 'Não percebi sintomas') {
          symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
        }
      });
    }
  });
  const topSymptom = Object.entries(symptomCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    totalDoses,
    takenDoses,
    adherenceRate,
    topMood,
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
