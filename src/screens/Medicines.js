import React from "react";
import { Alert, FlatList, Text, View } from "react-native";
import { useApp } from "../context/AppContext";
import { Button, Card, Empty, Heading, s } from "../components/UI";
import { testNotification } from "../services/notifications";
import { colors } from "../theme";

export default function Medicines({ navigation }) {
  const { medicines, deleteMedicine, busy } = useApp();

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
      renderItem={({ item }) => (
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
          {!!item.notes && <Text style={s.body}>{item.notes}</Text>}
          <View style={s.row}>
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
      )}
    />
  );
}