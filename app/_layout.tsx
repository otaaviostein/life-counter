import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GameProvider } from "./context/GameContext";

export default function RootLayout() {
  return (
    <GameProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </GameProvider>
  );
}
