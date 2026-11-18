import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppProvider, useApp } from "./src/context/AppContext";
import Today from "./src/screens/Today";
import Medicines from "./src/screens/Medicines";
import MedicineForm from "./src/screens/MedicineForm";
import Diary from "./src/screens/Diary";
import History from "./src/screens/History";
import { colors } from "./src/theme";
import { Button, s } from "./src/components/UI";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MedicinesStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.bg },
        animation: "fade_from_bottom",
      }}
    >
      <Stack.Screen
        name="MedicineList"
        component={Medicines}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MedicineForm"
        component={MedicineForm}
        options={{ title: "Cadastro", headerBackTitle: "Voltar" }}
      />
    </Stack.Navigator>
  );
}

const tabIcons = {
  Hoje: { active: "time", inactive: "time-outline" },
  Medicamentos: { active: "medkit", inactive: "medkit-outline" },
  Diário: { active: "heart", inactive: "heart-outline" },
  Histórico: { active: "stats-chart", inactive: "stats-chart-outline" },
};

function Main() {
  const { ready, loadError, retryLoad } = useApp();

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.bg,
          justifyContent: "center",
          padding: 32,
        }}
      >
        {loadError ? (
          <>
            <Text style={s.error}>{loadError}</Text>
            <Button title="Tentar novamente" onPress={retryLoad} />
          </>
        ) : (
          <ActivityIndicator size="large" color={colors.primary} />
        )}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Tabs.Navigator
        screenOptions={({ route }) => ({
          headerTitle: "MedDia",
          headerTitleStyle: {
            fontWeight: "800",
            color: colors.primary,
          },
          headerStyle: { backgroundColor: colors.bg },
          headerShadowVisible: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.muted,
          tabBarStyle: {
            backgroundColor: "white",
            borderTopColor: colors.border,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
          tabBarIcon: ({ color, focused }) => {
            const iconSet = tabIcons[route.name];
            const iconName = focused ? iconSet.active : iconSet.inactive;
            return <Ionicons name={iconName} size={23} color={color} />;
          },
        })}
      >
        <Tabs.Screen name="Hoje" component={Today} />
        <Tabs.Screen name="Medicamentos" component={MedicinesStack} />
        <Tabs.Screen name="Diário" component={Diary} />
        <Tabs.Screen name="Histórico" component={History} />
      </Tabs.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="dark" />
        <Main />
      </AppProvider>
    </SafeAreaProvider>
  );
}