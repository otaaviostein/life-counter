import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useGameContext } from "../context/GameContext";

export default function HomeScreen() {
  const { gameStarted, setGameStarted } = useGameContext();

  const [players, setPlayers] = useState(1);
  //const [gameStarted, setGameStarted] = useState(false);
  const [counters, setCounters] = useState(Array(6).fill(40)); // Support up to 6 players

  const updateCounter = (index: number, delta: number) => {
    setCounters((prev) => {
      const newCounters = [...prev];
      newCounters[index] += delta;
      return newCounters;
    });
  };

  const renderPlayers = () =>
    Array.from({ length: players }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.playerContainer,
          players === 3 && index === 2 && styles.player3Container,
          players === 5 && index === 4 && styles.player5Container,
        ]}
      >
        <View
          style={{
            transform: [
              {
                rotate:
                  index === 0 && players !== 1
                    ? "90deg"
                    : index === 0 && players === 1
                    ? "0deg"
                    : index === 1
                    ? "-90deg"
                    : index === 2 && players !== 3
                    ? "90deg"
                    : index === 2 && players === 3
                    ? "0deg"
                    : index === 3
                    ? "-90deg"
                    : index === 4 && players !== 5
                    ? "90deg"
                    : index === 4 && players === 5
                    ? "0deg"
                    : index === 5
                    ? "-90deg"
                    : "0deg",
              },
            ],
          }}
        >
          <Text style={styles.playerText}>Player {index + 1}</Text>
          <View style={styles.counterContainer}>
            <Text>Counter: {counters[index]}</Text>
          </View>
          <TouchableOpacity
            onPress={() => updateCounter(index, 1)}
            style={styles.button}
          >
            <Text>Increment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => updateCounter(index, -1)}
            style={styles.button}
          >
            <Text>Decrement</Text>
          </TouchableOpacity>
        </View>
      </View>
    ));

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!gameStarted ? (
          <View style={styles.startContainer}>
            <Text style={styles.title}>Life Counter</Text>
            <Text style={styles.subtitle}>Select the number of players:</Text>
            <Picker
              selectedValue={players.toString()} // Convert selectedValue to string
              style={styles.picker}
              onValueChange={(value) => setPlayers(parseInt(value, 10))} // Parse string back to number
            >
              {[...Array(6).keys()].map((n) => (
                <Picker.Item
                  key={n + 1}
                  label={`${n + 1}`}
                  value={(n + 1).toString()} // Ensure all Picker.Item values are strings
                  color="white"
                />
              ))}
            </Picker>

            <TouchableOpacity
              style={styles.startButton}
              onPress={() => setGameStarted(true)}
            >
              <Text style={styles.startButtonText}>Start</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.gridContainer}>{renderPlayers()}</View>
            <TouchableOpacity
              style={styles.startButton}
              onPress={() => {
                setPlayers(1);
                setCounters(Array(6).fill(40));
                setGameStarted(false);
              }}
            >
              <Text>Home</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
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
    marginTop: 20,
    backgroundColor: "green",
  },
  playerContainer: {
    backgroundColor: "red",
    borderColor: "black",
    borderWidth: 1,
    margin: 5,
    flexBasis: "45%",
    height: "35%",
    alignItems: "center",
    padding: 10,
  },
  player3Container: {
    flexBasis: "92%", // Make Player 3 span full width
    height: "40%",
  },
  player5Container: {
    flexBasis: "90%", // Make Player 5 span two rows
    height: "20%",
  },
  playerText: {
    fontSize: 20,
    fontWeight: "bold",
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
