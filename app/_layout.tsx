import { Stack } from "expo-router";
import { GameProvider } from "./context/GameContext";

export default function RootLayout() {
  return (
    <GameProvider>
      <Stack />
    </GameProvider>
  );
}
