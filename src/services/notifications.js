import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

export async function requestReminders() {
    if (Platform.OS === "android") {
        try {
            await Notifications.setNotificationChannelAsync(
                "meddia-reminders",
                {
                    name: "Horários dos medicamentos",
                    importance: Notifications.AndroidImportance.HIGH,
                    sound: "default",
                    vibrationPattern: [0, 250, 250, 250],
                },
            );
        } catch {
            throw new Error(
                "Não foi possível criar o canal de notificações. Esta versão do aplicativo (Expo Go) não suporta notificações.",
            );
        }

        let permission = await Notifications.getPermissionsAsync();

        if (!permission.granted) {
            permission = await Notifications.requestPermissionsAsync();
        }

        if (!permission.granted) {
            throw new Error(
                "As notificações não foram autorizadas. Ative a permissão nas configurações do Android.",
            );
        }
    }
}

export async function cancelNotifications(ids = []) {
    for (const id of ids) {
        await Notifications.cancelScheduledNotificationAsync(id);
    }
}

export async function scheduleMedicine(medicine) {
    const ids = [];

    try {
        await requestReminders();

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
        throw error;
    }
}

export async function testNotification() {
    await requestReminders();

    return Notifications.scheduleNotificationAsync({
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
}
