import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useGameContext } from "./context/GameContext";

export default function Index() {
  const { gameStarted, setGameStarted } = useGameContext();

  const [players, setPlayers] = useState(1);
  const [counters, setCounters] = useState(Array(6).fill(40));

  const updateCounter = (index: number, delta: number) => {
    setCounters((prev) => {
      const newCounters = [...prev];
      newCounters[index] += delta;
      return newCounters;
    });
  };

  const getPlayerRotation = (index: number) => {
    const rotationMap = {
      0: players === 2 ? "180deg" : players === 1 ? "0deg" : "90deg",
      1: players === 2 ? "0deg" : "-90deg",
      2: players === 3 ? "0deg" : "90deg",
      3: "-90deg",
      4: players === 5 ? "0deg" : "90deg",
      5: "-90deg",
    };
    return rotationMap[index] || "0deg";
  };

  const renderPlayers = () =>
    Array.from({ length: players }).map((_, index) => (
      <View
        key={index}
        style={[
          styles.basePlayerContainer,
          styles[`playerContainer${players}`],
          index === 0 && styles[`firstPlayerContainer${players}`],
          index === 1 && styles[`secondPlayerContainer${players}`],
          index === 2 && styles[`thirdPlayerContainer${players}`],
          index === 4 && styles[`fourthPlayerContainer${players}`],
        ]}
      >
        <View style={{ transform: [{ rotate: getPlayerRotation(index) }] }}>
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
              selectedValue={players.toString()}
              style={styles.picker}
              onValueChange={(value) => setPlayers(parseInt(value, 10))}
            >
              {[...Array(6).keys()].map((n) => (
                <Picker.Item
                  key={n + 1}
                  label={`${n + 1}`}
                  value={(n + 1).toString()}
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
            <View
              style={[
                players !== 2 && styles.gridContainer,
                players === 2 && styles.twoPlayerGridContainer,
              ]}
            >
              {renderPlayers()}
            </View>
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
    color: "white",
  },
  startButton: {
    marginTop: 15,
    backgroundColor: "white",
    padding: 15,
    alignItems: "center",
    width: "100%",
    borderRadius: 5,
  },
  startButtonText: {
    color: "black",
    fontSize: 14,
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
  twoPlayerGridContainer: {
    flex: 1,
    flexDirection: "column",
    marginTop: 20,
    backgroundColor: "green",
  },
  basePlayerContainer: {
    backgroundColor: "red",
    borderColor: "black",
    borderWidth: 1,
    margin: 5,
    flexBasis: "45%",
    alignItems: "center",
    padding: 10,
  },
  playerContainer1: {
    flexBasis: "92%",
    flex: 1,
    justifyContent: "center",
    height: "100%",
  },
  playerContainer2: {
    height: "50%",
    justifyContent: "center",
  },
  playerContainer3: {
    height: "50%",
    justifyContent: "center",
  },
  playerContainer4: {
    height: "48%",
    justifyContent: "center",
  },
  playerContainer5: {
    height: "35%",
    justifyContent: "center",
  },
  playerContainer6: {
    height: "31%",
    justifyContent: "center",
  },
  firstPlayerContainer3: {
    height: "50%",
  },
  secondPlayerContainer3: {
    height: "50%",
  },
  thirdPlayerContainer3: {
    flexBasis: "92%",
    height: "45%",
  },
  fourthPlayerContainer5: {
    flexBasis: "92%",
    height: "25%",
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
