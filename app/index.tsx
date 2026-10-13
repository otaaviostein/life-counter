import { useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import { useFonts, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { SafeAreaView, StyleSheet } from "react-native";

import { GameBoard } from "../components/game-board";
import { HomeScreen } from "../components/home-screen";
import { type GameConfig } from "../lib/game";

export default function Index() {
  useKeepAwake();
  const [fontsLoaded] = useFonts({ Nunito_800ExtraBold });
  // Mounting GameBoard per game gives each game fresh state; going home
  // unmounts it, so there is no cross-game reset bookkeeping here.
  const [game, setGame] = useState<GameConfig | null>(null);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      {game ? (
        <GameBoard config={game} onHome={() => setGame(null)} />
      ) : (
        <HomeScreen onBegin={setGame} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0C0F13",
  },
});
