import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import { Platform, Vibration } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

async function ensureChannelAndPermission() {
  if (Platform.OS === "android") {
    // No Expo Go SDK 53+, criar canal pode falhar; tentamos sem quebrar o fluxo
    try {
      await Notifications.setNotificationChannelAsync("meddia-reminders", {
        name: "Horários dos medicamentos",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    } catch {
      // Ignora erro de canal no Expo Go
    }
  }

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    throw new Error(
      "As notificações não foram autorizadas. Ative a permissão nas configurações do Android."
    );
  }
}

export async function cancelNotifications(ids = []) {
  if (!ids?.length) return;

  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignora IDs já expirados ou inválidos
    }
  }
}

export async function scheduleMedicine(medicine) {
  const ids = [];

  try {
    await ensureChannelAndPermission();

    for (const time of medicine.times) {
      const [hour, minute] = time.split(":").map(Number);

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Hora do seu medicamento",
          body: `${medicine.name} • ${medicine.dose} • ${time}`,
          sound: "default",
          data: { medicineId: medicine.id },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: "meddia-reminders",
        },
      });

      ids.push(id);
    }

    return ids;
  } catch (error) {
    await cancelNotifications(ids);
    throw new Error(
      "No Expo Go os alarmes diários são limitados pelo Android. No APK do MedDia eles funcionam normalmente."
    );
  }
}

export async function testNotification() {
  try {
    await ensureChannelAndPermission();

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "MedDia • teste de lembrete",
        body: "As notificações estão funcionando. Este é apenas um teste.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: "meddia-reminders",
      },
    });

    return { simulated: false };
  } catch {
    // Fallback garantido quando o Expo Go bloqueia notificações nativas
    Vibration.vibrate([0, 400, 150, 400]);
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {}
    return { simulated: true };
  }
}