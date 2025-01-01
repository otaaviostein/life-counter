import { Image, StyleSheet, Platform } from "react-native";
import { HelloWave } from "@/components/HelloWave";
import ParallaxScrollView from "@/components/ParallaxScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useState } from "react";

export default function HomeScreen() {
  const [players, setPlayers] = useState(1);
  const [gameStarted, setGameStarted] = useState(false);
  const [counters, setCounters] = useState(Array(6).fill(40)); // Support up to 6 players

  const incrementCounter = (index: number) => {
    const newCounters = [...counters];
    newCounters[index] += 1;
    setCounters(newCounters);
  };

  const decrementCounter = (index: number) => {
    const newCounters = [...counters];
    newCounters[index] -= 1;
    setCounters(newCounters);
  };

  const playerStyle = (numPlayers: number, index: number) => {
    if (numPlayers === 3) {
      if (index === 2) {
        return { gridColumn: "1 / span 2", gridRow: "2" }; // Span both columns on the second row
      }
      return { gridColumn: index + 1, gridRow: 1 };
    }
    if (numPlayers === 5) {
      if (index === 4) {
        return { gridColumn: "3", gridRow: "1 / span 2" }; // Span two rows on the right
      }
      return {
        gridColumn: (index % 2) + 1,
        gridRow: Math.floor(index / 2) + 1,
      };
    }
    return {};
  };

  const gridContainerStyle = (numPlayers: number) => {
    if (numPlayers === 1) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr",
        gridTemplateRows: "1fr",
      };
    }
    if (numPlayers === 2) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr",
      };
    }
    if (numPlayers === 3) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "10px",
      };
    }
    if (numPlayers === 4) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
    }
    if (numPlayers === 5) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
        gap: "10px",
      };
    }
    if (numPlayers === 6) {
      return {
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gridTemplateRows: "1fr 1fr",
      };
    }
    return {};
  };

  return (
    <ThemedView style={{ flex: 1 }}>
      {!gameStarted ? (
        <ThemedView
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: 40,
            paddingHorizontal: 20,
          }}
        >
          <ThemedText
            style={{
              fontSize: 36,
              fontWeight: "bold",
              marginBottom: 10,
              color: "white",
            }}
          >
            Life Counter
          </ThemedText>
          <ThemedText style={{ marginTop: 10, color: "white" }}>
            Select the number of players:
          </ThemedText>
          <select
            name="players"
            id="players"
            style={{ width: "100%", marginTop: 10, height: 30 }}
            onChange={(e) => setPlayers(parseInt(e.target.value))}
          >
            {[...Array(6).keys()].map((n) => (
              <option key={n + 1} value={n + 1}>
                {n + 1}
              </option>
            ))}
          </select>
          <button
            style={{
              marginTop: 20,
              backgroundColor: "white",
              color: "black",
              outline: "none",
              padding: 10,
              border: "none",
              width: "100%",
            }}
            onClick={() => setGameStarted(true)}
          >
            Start
          </button>
        </ThemedView>
      ) : (
        <ThemedView
          style={{
            ...gridContainerStyle(players),
            gap: "10px",
            backgroundColor: "black",
            height: "100%",
          }}
        >
          {Array.from({ length: players }).map((_, index) => (
            <div
              key={index}
              style={{
                ...playerStyle(players, index),
                backgroundColor: "white",
                border: "1px solid black",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div style={{ fontSize: 20, fontWeight: "bold" }}>
                Player {index + 1}
              </div>
              <div style={{ marginTop: 10 }}>
                <ThemedText>Counter: {counters[index]}</ThemedText>
              </div>
              <button
                onClick={() => incrementCounter(index)}
                style={{ marginTop: 10 }}
              >
                Increment
              </button>
              <button
                onClick={() => decrementCounter(index)}
                style={{ marginTop: 10 }}
              >
                Decrement
              </button>
            </div>
          ))}
        </ThemedView>
      )}
    </ThemedView>
  );
}
