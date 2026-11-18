import React, { useState } from "react";
import { Alert, FlatList, Modal, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, Card, Empty, Field, Heading, s } from "../components/UI";
import { testNotification } from "../services/notifications";
import { colors } from "../theme";

export default function Medicines({ navigation }) {
  const { medicines, deleteMedicine, restockMedicine, busy } = useApp();
  const [restockTarget, setRestockTarget] = useState(null);
  const [customAmount, setCustomAmount] = useState("");
  const [restockError, setRestockError] = useState("");

  async function handleTestAlert() {
    try {
      const result = await testNotification();

      if (result?.simulated) {
        Alert.alert(
          "Simulação no Expo Go",
          "Você sentiu a vibração? No Expo Go o Android bloqueia canais de notificação em segundo plano, mas no APK gerado do MedDia o alerta sonoro dispara normalmente."
        );
      } else {
        Alert.alert(
          "Teste agendado",
          "Aguarde 5 segundos para verificar se a notificação aparece no seu aparelho."
        );
      }
    } catch (e) {
      Alert.alert("Não foi possível testar", e.message);
    }
  }

  function openRestock(item) {
    setRestockTarget(item);
    setCustomAmount(item.packSize ? String(item.packSize) : "");
    setRestockError("");
  }

  async function confirmRestock(amountToAdd) {
    if (!restockTarget) return;
    const num = Number(amountToAdd);

    if (!Number.isInteger(num) || num <= 0 || num > 9999) {
      setRestockError("Informe uma quantidade válida maior que zero.");
      return;
    }

    try {
      await restockMedicine(restockTarget.id, num);
      setRestockTarget(null);
    } catch {
      setRestockError("Não foi possível atualizar o estoque.");
    }
  }

  function remove(item) {
    Alert.alert(
      "Excluir medicamento?",
      `Os lembretes de ${item.name} serão cancelados. Os registros anteriores continuarão no histórico.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteMedicine(item.id);
            } catch {
              Alert.alert(
                "Falha ao excluir",
                "Tente novamente e confira os lembretes do medicamento."
              );
            }
          },
        },
      ]
    );
  }

  return (
    <>
      <FlatList
        style={{ backgroundColor: colors.bg }}
        contentContainerStyle={s.page}
        data={medicines}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={
          <>
            <Heading
              title="Medicamentos"
              subtitle="Sua rotina de cuidado, em um só lugar."
            />
            <Button
              title="+ Adicionar medicamento"
              onPress={() => navigation.navigate("MedicineForm")}
            />
            <Button
              secondary
              title="🔔 Testar som e notificação"
              onPress={handleTestAlert}
            />
            <View style={{ height: 20 }} />
          </>
        }
        ListEmptyComponent={
          <Empty
            title="Nenhum medicamento cadastrado"
            text="Adicione nome, dose e horários para começar."
          />
        }
        renderItem={({ item }) => {
          const hasStock = typeof item.stock === "number";
          const isLow = hasStock && item.stock <= (item.lowStockAlert ?? 5);

          return (
            <Card>
              <Text style={s.title}>{item.name}</Text>
              <Text style={s.body}>{item.dose}</Text>
              <Text style={[s.label, { marginTop: 10 }]}>
                {item.times.join(" • ")}
              </Text>
              <Text style={s.body}>
                {item.reminders
                  ? "🔔 Lembretes diários ativados"
                  : "Lembretes desligados"}
              </Text>

              {hasStock && (
                <View
                  style={{
                    marginTop: 10,
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: isLow
                      ? colors.warningPale
                      : colors.successPale,
                    alignSelf: "flex-start",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: isLow ? colors.warning : colors.success,
                    }}
                  >
                    {isLow ? "⚠️ " : "📦 "}
                    Estoque: {item.stock}{" "}
                    {item.stock === 1 ? "unidade" : "unidades"}
                  </Text>
                </View>
              )}

              {!!item.notes && (
                <Text style={[s.body, { marginTop: 8 }]}>{item.notes}</Text>
              )}

              <View style={[s.row, { marginTop: 8 }]}>
                {hasStock && (
                  <Button
                    secondary
                    disabled={busy}
                    title="+ Repor"
                    onPress={() => openRestock(item)}
                  />
                )}
                <Button
                  secondary
                  disabled={busy}
                  title="Editar"
                  onPress={() =>
                    navigation.navigate("MedicineForm", {
                      id: item.id,
                    })
                  }
                />
                <Button
                  secondary
                  disabled={busy}
                  title="Excluir"
                  onPress={() => remove(item)}
                />
              </View>
            </Card>
          );
        }}
      />

      <Modal
        visible={!!restockTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setRestockTarget(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(53, 43, 66, 0.45)",
            justifyContent: "center",
            padding: 22,
          }}
        >
          <Card style={{ marginBottom: 0 }}>
            <Text style={s.title}>Repor {restockTarget?.name}</Text>
            <Text style={[s.body, { marginBottom: 14 }]}>
              Estoque atual: {restockTarget?.stock ?? 0}{" "}
              {restockTarget?.stock === 1 ? "unidade" : "unidades"}.
            </Text>

            {!!restockTarget?.packSize && (
              <Button
                secondary
                disabled={busy}
                title={`+ 1 embalagem padrão (${restockTarget.packSize} un.)`}
                onPress={() => confirmRestock(restockTarget.packSize)}
              />
            )}

            <View style={{ marginTop: 14 }}>
              <Field
                label="Ou digite a quantidade a adicionar"
                value={customAmount}
                onChangeText={setCustomAmount}
                placeholder="Ex.: 28"
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>

            {!!restockError && <Text style={s.error}>{restockError}</Text>}

            <Button
              disabled={busy}
              title="Adicionar ao estoque"
              onPress={() => confirmRestock(customAmount)}
            />
            <Button
              secondary
              disabled={busy}
              title="Cancelar"
              onPress={() => setRestockTarget(null)}
            />
          </Card>
        </View>
      </Modal>
    </>
  );
}