import React, { useState } from "react";
import { Alert, FlatList, Share, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, Card, Empty, Heading, s } from "../components/UI";
import { colors, moods } from "../theme";
import { formatDate, getWeeklySummary } from "../utils/domain";

export default function History() {
  const {
    medicines,
    records,
    entries,
    deleteEntry,
    deleteRecord,
    clearHistory,
    busy,
  } = useApp();
  const [filter, setFilter] = useState("all");

  const summary = getWeeklySummary(records, entries, medicines);
  const topMoodObj = moods.find((m) => m.value === summary.topMood);

  const items = [
    ...(filter !== "diary" ? records.map((r) => ({ ...r, kind: "dose" })) : []),
    ...(filter !== "dose"
      ? entries.map((e) => ({ ...e, kind: "diary" }))
      : []),
  ].sort((a, b) => b.at.localeCompare(a.at));

  async function shareSummary() {
    const lines = [
      "📋 *Relatório de Acompanhamento (7 dias) — MedDia*",
      `Gerado em: ${new Date().toLocaleDateString("pt-BR")}`,
      "",
    ];

    if (summary.adherenceRate !== null) {
      lines.push(
        `*Adesão geral:* ${summary.adherenceRate}% (${summary.takenDoses}/${summary.totalDoses} doses tomadas)`
      );
      summary.byMedicine.forEach((m) => {
        lines.push(`  • ${m.name}: ${m.taken}/${m.total} (${m.rate}%)`);
      });
      if (summary.delayedCount > 0) {
        lines.push(
          `  • Doses tomadas com >30 min de atraso: ${summary.delayedCount}`
        );
      }
    } else {
      lines.push("*Adesão:* Nenhuma dose registrada nos últimos 7 dias.");
    }

    if (topMoodObj || summary.symptomsList.length > 0) {
      lines.push("", "*Bem-estar e sintomas:*");
      if (topMoodObj) {
        lines.push(`  • Humor predominante: ${topMoodObj.emoji} ${topMoodObj.label}`);
      }
      summary.symptomsList.forEach((sym) => {
        const ctx = sym.meds.length ? ` (em uso: ${sym.meds.join(", ")})` : "";
        lines.push(`  • ${sym.name}: ${sym.count}x${ctx}`);
      });
    }

    if (summary.lowStockMeds.length > 0) {
      lines.push("", "*Precisam de reposição/receita:*");
      summary.lowStockMeds.forEach((m) => {
        lines.push(`  ⚠️ ${m.name} — restam ${m.stock} un.`);
      });
    }

    try {
      await Share.share({ message: lines.join("\n") });
    } catch {
      Alert.alert(
        "Não foi possível compartilhar",
        "Tente novamente em instantes."
      );
    }
  }

  function removeItem(item) {
    const isDose = item.kind === "dose";
    Alert.alert(
      isDose ? "Excluir registro de dose?" : "Excluir registro do diário?",
      "Esta ação remove apenas este registro do histórico.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              if (isDose) {
                await deleteRecord(item.id);
              } else {
                await deleteEntry(item.id);
              }
            } catch {
              Alert.alert("Falha ao excluir", "Tente novamente.");
            }
          },
        },
      ]
    );
  }

  function handleClearHistory() {
    Alert.alert(
      "Limpar registros do histórico",
      "Escolha quais registros deseja apagar do aparelho:",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Mais antigos que 30 dias",
          onPress: () => clearHistory(30),
        },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: () => clearHistory(null),
        },
      ]
    );
  }

  const hasAnyInsight =
    summary.totalDoses > 0 ||
    !!topMoodObj ||
    summary.symptomsList.length > 0 ||
    summary.lowStockMeds.length > 0;

  return (
    <FlatList
      style={{ backgroundColor: colors.bg }}
      contentContainerStyle={s.page}
      data={items}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      ListHeaderComponent={
        <>
          <Heading
            title="Seu histórico"
            subtitle="Padrões da sua rotina para acompanhar ou levar à consulta."
          />

          <Card
            style={{
              backgroundColor: colors.pale,
              borderColor: "#CCB9DF",
            }}
          >
            <Text style={[s.eyebrow, { marginBottom: 8 }]}>
              SÍNTESE DOS ÚLTIMOS 7 DIAS
            </Text>

            {!hasAnyInsight ? (
              <Text style={s.body}>
                Registre suas doses ou seu humor para acompanhar a adesão por
                medicamento e padrões de sintomas aqui.
              </Text>
            ) : (
              <>
                {summary.adherenceRate !== null && (
                  <View style={{ marginBottom: 8 }}>
                    <Text style={s.body}>
                      • Adesão geral:{" "}
                      <Text style={{ fontWeight: "700", color: colors.ink }}>
                        {summary.adherenceRate}%
                      </Text>{" "}
                      ({summary.takenDoses}/{summary.totalDoses} tomadas)
                    </Text>

                    {summary.byMedicine.map((m, idx) => (
                      <Text
                        key={m.id || `${m.name}-${idx}`}
                        style={[s.body, { paddingLeft: 12, fontSize: 13 }]}
                      >
                        ↳ {m.name}:{" "}
                        <Text style={{ fontWeight: "700", color: colors.ink }}>
                          {m.taken}/{m.total} ({m.rate}%)
                        </Text>
                      </Text>
                    ))}

                    {summary.delayedCount > 0 && (
                      <Text
                        style={[
                          s.body,
                          { paddingLeft: 12, fontSize: 13, color: colors.warning },
                        ]}
                      >
                        ⏰ {summary.delayedCount}{" "}
                        {summary.delayedCount === 1
                          ? "dose tomada"
                          : "doses tomadas"}{" "}
                        com mais de 30 min de atraso
                      </Text>
                    )}
                  </View>
                )}

                {topMoodObj && (
                  <Text style={s.body}>
                    • Humor predominante:{" "}
                    <Text style={{ fontWeight: "700", color: colors.ink }}>
                      {topMoodObj.emoji} {topMoodObj.label}
                    </Text>
                  </Text>
                )}

                {summary.symptomsList.length > 0 && (
                  <View style={{ marginTop: 4 }}>
                    <Text style={s.body}>• Sintomas relatados:</Text>
                    {summary.symptomsList.slice(0, 3).map((sym) => (
                      <Text
                        key={sym.name}
                        style={[s.body, { paddingLeft: 12, fontSize: 13 }]}
                      >
                        ↳{" "}
                        <Text style={{ fontWeight: "700", color: colors.ink }}>
                          {sym.name} ({sym.count}x)
                        </Text>
                        {sym.meds.length > 0
                          ? ` • uso: ${sym.meds.join(", ")}`
                          : ""}
                      </Text>
                    ))}
                  </View>
                )}

                {summary.lowStockMeds.length > 0 && (
                  <Text
                    style={[
                      s.body,
                      { marginTop: 6, color: colors.warning, fontWeight: "700" },
                    ]}
                  >
                    ⚠️ Repor em breve:{" "}
                    {summary.lowStockMeds
                      .map((m) => `${m.name} (${m.stock} un.)`)
                      .join(", ")}
                  </Text>
                )}
              </>
            )}

            {hasAnyInsight && (
              <Button
                title="📤 Compartilhar relatório para consulta"
                onPress={shareSummary}
                style={{ marginTop: 14 }}
              />
            )}
          </Card>

          <View style={[s.row, { marginBottom: 20 }]}>
            {[
              ["all", " Tudo "],
              ["dose", " Doses "],
              ["diary", "Diário "],
            ].map(([value, title]) => (
              <Button
                key={value}
                secondary={filter !== value}
                title={title}
                style={{ flex: 1 }}
                onPress={() => setFilter(value)}
              />
            ))}
          </View>
        </>
      }
      ListEmptyComponent={
        <Empty
          title="Ainda não há registros aqui"
          text="Marque uma dose ou registre seu humor para começar seu histórico."
        />
      }
      ListFooterComponent={
        records.length > 0 || entries.length > 0 ? (
          <View style={{ marginTop: 12, marginBottom: 24 }}>
            <Button
              secondary
              disabled={busy}
              title="🗑️ Limpar registros do histórico"
              onPress={handleClearHistory}
            />
          </View>
        ) : null
      }
      renderItem={({ item }) => (
        <Card>
          <Text style={[s.eyebrow, { marginBottom: 10 }]}>
            {item.kind === "dose" ? "MEDICAMENTO" : "DIÁRIO"}
            {" • "}
            {formatDate(item.at)}
          </Text>

          {item.kind === "dose" ? (
            <>
              <Text style={s.title}>{item.medicineName}</Text>
              <Text style={s.body}>
                {item.dose} • Previsto: {item.scheduledTime}
                {item.takenAtTime ? ` • Tomado às ${item.takenAtTime}` : ""}
              </Text>
              <Text style={[s.label, { marginTop: 10 }]}>
                {item.status === "taken"
                  ? "✓ Marcada como tomada"
                  : "Dose pulada"}
              </Text>
              <Button
                secondary
                disabled={busy}
                title="Excluir registro"
                onPress={() => removeItem(item)}
              />
            </>
          ) : (
            <>
              <Text style={s.title}>
                {moods.find((m) => m.value === item.mood)?.emoji}{" "}
                {moods.find((m) => m.value === item.mood)?.label}
              </Text>

              {!!item.feelings && (
                <Text style={s.body}>Sentimentos: {item.feelings}</Text>
              )}
              {!!item.symptoms && (
                <Text style={s.body}>Sintomas: {item.symptoms}</Text>
              )}
              {!!item.medicines?.length && (
                <Text style={s.body}>
                  Medicamentos selecionados:{" "}
                  {item.medicines.map((m) => m.name).join(", ")}
                </Text>
              )}
              {!!item.notes && <Text style={s.body}>Obs.: {item.notes}</Text>}

              <Button
                secondary
                disabled={busy}
                title="Excluir registro"
                onPress={() => removeItem(item)}
              />
            </>
          )}
        </Card>
      )}
    />
  );
}