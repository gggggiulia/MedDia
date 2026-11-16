import React, { useState } from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, Card, Empty, Heading, s } from "../components/UI";
import { colors, moods } from "../theme";
import { formatDate, getWeeklySummary } from "../utils/domain";

export default function History() {
    const { records, entries, deleteEntry, busy } = useApp();
    const [filter, setFilter] = useState("all");

    const summary = getWeeklySummary(records, entries);
    const topMoodObj = moods.find((m) => m.value === summary.topMood);

    const items = [
        ...(filter !== "diary"
            ? records.map((r) => ({ ...r, kind: "dose" }))
            : []),
        ...(filter !== "dose"
            ? entries.map((e) => ({ ...e, kind: "diary" }))
            : []),
    ].sort((a, b) => b.at.localeCompare(a.at));

    function remove(item) {
        Alert.alert(
            "Excluir registro do diário?",
            "Esta ação remove este registro do aparelho.",
            [
                { text: "Cancelar", style: "cancel" },
                {
                    text: "Excluir",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteEntry(item.id);
                        } catch {
                            Alert.alert("Falha ao excluir", "Tente novamente.");
                        }
                    },
                },
            ],
        );
    }

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
                        subtitle="Pequenos registros ajudam a enxergar sua rotina."
                    />

                    <Card
                        style={{
                            backgroundColor: colors.pale,
                            borderColor: "#CCB9DF",
                        }}
                    >
                        <Text style={[s.eyebrow, { marginBottom: 8 }]}>
                            RESUMO DOS ÚLTIMOS 7 DIAS
                        </Text>

                        {summary.totalDoses === 0 &&
                        !topMoodObj &&
                        !summary.topSymptom ? (
                            <Text style={s.body}>
                                Registre suas doses ou seu humor para acompanhar
                                o resumo da sua semana aqui.
                            </Text>
                        ) : (
                            <>
                                {summary.adherenceRate !== null && (
                                    <Text style={s.body}>
                                        • Progresso:{" "}
                                        <Text
                                            style={{
                                                fontWeight: "700",
                                                color: colors.ink,
                                            }}
                                        >
                                            {summary.adherenceRate}%
                                        </Text>{" "}
                                        ({summary.takenDoses} de{" "}
                                        {summary.totalDoses} doses tomadas)
                                    </Text>
                                )}
                                {topMoodObj && (
                                    <Text style={s.body}>
                                        • Humor predominante:{" "}
                                        <Text
                                            style={{
                                                fontWeight: "700",
                                                color: colors.ink,
                                            }}
                                        >
                                            {topMoodObj.emoji}{" "}
                                            {topMoodObj.label}
                                        </Text>
                                    </Text>
                                )}
                                {summary.topSymptom && (
                                    <Text style={s.body}>
                                        • Sintoma mais frequente:{" "}
                                        <Text
                                            style={{
                                                fontWeight: "700",
                                                color: colors.ink,
                                            }}
                                        >
                                            {summary.topSymptom}
                                        </Text>
                                    </Text>
                                )}
                            </>
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
                                {item.dose} • Horário: {item.scheduledTime}
                            </Text>
                            <Text style={[s.label, { marginTop: 10 }]}>
                                {item.status === "taken"
                                    ? "✓ Marcada como tomada"
                                    : "Dose pulada"}
                            </Text>
                        </>
                    ) : (
                        <>
                            <Text style={s.title}>
                                {
                                    moods.find((m) => m.value === item.mood)
                                        ?.emoji
                                }{" "}
                                {
                                    moods.find((m) => m.value === item.mood)
                                        ?.label
                                }
                            </Text>

                            {!!item.feelings && (
                                <Text style={s.body}>
                                    Sentimentos: {item.feelings}
                                </Text>
                            )}
                            {!!item.symptoms && (
                                <Text style={s.body}>
                                    Sintomas: {item.symptoms}
                                </Text>
                            )}
                            {!!item.medicines?.length && (
                                <Text style={s.body}>
                                    Medicamentos selecionados:{" "}
                                    {item.medicines
                                        .map((m) => m.name)
                                        .join(", ")}
                                </Text>
                            )}
                            {!!item.notes && (
                                <Text style={s.body}>{item.notes}</Text>
                            )}

                            <Button
                                secondary
                                disabled={busy}
                                title="Excluir registro"
                                onPress={() => remove(item)}
                            />
                        </>
                    )}
                </Card>
            )}
        />
    );
}
