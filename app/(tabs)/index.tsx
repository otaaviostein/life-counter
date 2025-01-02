import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Picker } from "@react-native-picker/picker";

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

  const renderPlayers = () => {
    return Array.from({ length: players }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.playerContainer,
          players === 3 && index === 2 ? styles.player3Container : null,
          players === 5 && index === 4 ? styles.player5Container : null,
        ]}
      >
        <Text
          style={[
            styles.playerText,
            players === 5 && index === 4 ? styles.rotatedText : null,
          ]}
        >
          Player {index + 1}
        </Text>
        <View style={styles.counterContainer}>
          <ThemedText>Counter: {counters[index]}</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => incrementCounter(index)}
          style={styles.button}
        >
          <Text>Increment</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => decrementCounter(index)}
          style={styles.button}
        >
          <Text>Decrement</Text>
        </TouchableOpacity>
      </View>
    ));
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ThemedView style={styles.container}>
        {!gameStarted ? (
          <ThemedView style={styles.startContainer}>
            <ThemedText style={styles.title}>Life Counter</ThemedText>
            <ThemedText style={styles.subtitle}>
              Select the number of players:
            </ThemedText>
            <Picker
              selectedValue={players}
              style={styles.picker}
              onValueChange={(itemValue) => setPlayers(itemValue)}
            >
              {[...Array(6).keys()].map((n) => (
                <Picker.Item key={n + 1} label={`${n + 1}`} value={n + 1} />
              ))}
            </Picker>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setGameStarted(true)}
            >
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </ThemedView>
        ) : (
          <ThemedView style={styles.gridContainer}>
            {renderPlayers()}
          </ThemedView>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  startContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 10,
    color: "white",
  },
  subtitle: {
    marginTop: 10,
    color: "white",
  },
  picker: {
    width: "100%",
    marginTop: 10,
    height: 30,
    color: "white",
  },
  startButton: {
    marginTop: 20,
    backgroundColor: "white",
    padding: 10,
    alignItems: "center",
    width: "100%",
  },
  startButtonText: {
    color: "black",
  },
  gridContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
  },
  playerContainer: {
    backgroundColor: "white",
    borderColor: "black",
    borderWidth: 1,
    margin: 5,
    flexBasis: "45%",
    alignItems: "center",
    padding: 10,
  },
  player3Container: {
    flexBasis: "90%", // Make Player 3 span full width
  },
  player5Container: {
    flexBasis: "90%", // Make Player 5 span two rows
  },
  playerText: {
    fontSize: 20,
    fontWeight: "bold",
  },
  rotatedText: {
    transform: [{ rotate: "90deg" }],
  },
  counterContainer: {
    marginTop: 10,
  },
  button: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "lightgray",
    alignItems: "center",
    width: "100%",
  },
});
