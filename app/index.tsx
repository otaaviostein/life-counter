import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Modal,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

import { useGameContext } from "./context/GameContext";

export default function Index() {
  const { gameStarted, setGameStarted } = useGameContext();

  const [players, setPlayers] = useState(1);
  const [counters, setCounters] = useState(Array(6).fill(40));
  const [commanderDamage, setCommanderDamage] = useState(
    Array(6).fill(null).map(() => Array(6).fill(0))
  );
  const [showCommanderModal, setShowCommanderModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(0);

  const updateCounter = (index: number, delta: number) => {
    setCounters((prev) => {
      const newCounters = [...prev];
      newCounters[index] += delta;
      return newCounters;
    });
  };

  const openCommanderModal = (playerIndex: number) => {
    setSelectedPlayer(playerIndex);
    setShowCommanderModal(true);
  };

  const updateCommanderDamage = (fromPlayer: number, toPlayer: number, delta: number) => {
    setCommanderDamage((prev) => {
      const newDamage = prev.map(row => [...row]);
      newDamage[toPlayer][fromPlayer] = Math.max(0, newDamage[toPlayer][fromPlayer] + delta);
      return newDamage;
    });
  };

  const getCommanderDamageDisplay = (playerIndex: number) => {
    const damages = [];
    for (let i = 0; i < players; i++) {
      if (i !== playerIndex && commanderDamage[playerIndex][i] > 0) {
        damages.push(`P${i + 1}: ${commanderDamage[playerIndex][i]}`);
      }
    }
    return damages;
  };

  const getTotalCommanderDamage = (playerIndex: number) => {
    return commanderDamage[playerIndex].reduce((total, damage) => total + damage, 0);
  };

  const getAdjustedLifeTotal = (playerIndex: number) => {
    return counters[playerIndex] - getTotalCommanderDamage(playerIndex);
  };

  const getRotationAwareTouchConfig = (playerIndex: number) => {
    const rotation = getPlayerRotation(playerIndex);
    
    if (rotation === "90deg") {
      // When rotated 90deg clockwise: top becomes decrement, bottom becomes increment
      return {
        decrementArea: styles.topTouchArea,
        incrementArea: styles.bottomTouchArea,
        decrementAction: () => updateCounter(playerIndex, -1),
        incrementAction: () => updateCounter(playerIndex, 1)
      };
    } else if (rotation === "-90deg") {
      // When rotated -90deg counterclockwise: bottom becomes decrement, top becomes increment
      return {
        decrementArea: styles.bottomTouchArea,
        incrementArea: styles.topTouchArea,
        decrementAction: () => updateCounter(playerIndex, -1),
        incrementAction: () => updateCounter(playerIndex, 1)
      };
    } else if (rotation === "180deg") {
      // When rotated 180deg: right becomes decrement, left becomes increment
      return {
        decrementArea: styles.rightTouchArea,
        incrementArea: styles.leftTouchArea,
        decrementAction: () => updateCounter(playerIndex, -1),
        incrementAction: () => updateCounter(playerIndex, 1)
      };
    } else {
      // No rotation (0deg): normal left=decrement, right=increment
      return {
        decrementArea: styles.leftTouchArea,
        incrementArea: styles.rightTouchArea,
        decrementAction: () => updateCounter(playerIndex, -1),
        incrementAction: () => updateCounter(playerIndex, 1)
      };
    }
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
{(() => {
          const config = getRotationAwareTouchConfig(index);
          const rotation = getPlayerRotation(index);
          return (
            <>
              <TouchableOpacity
                style={config.decrementArea}
                onPress={config.decrementAction}
                activeOpacity={0.7}
              >
                <Text style={[styles.decrementIndicator, { transform: [{ rotate: rotation }] }]}>-</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={config.incrementArea}
                onPress={config.incrementAction}
                activeOpacity={0.7}
              >
                <Text style={[styles.incrementIndicator, { transform: [{ rotate: rotation }] }]}>+</Text>
              </TouchableOpacity>
            </>
          );
        })()}
        
        <View style={{ transform: [{ rotate: getPlayerRotation(index) }] }}>
          <Text style={styles.playerText}>Player {index + 1}</Text>
          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>{getAdjustedLifeTotal(index)}</Text>
            {getCommanderDamageDisplay(index).length > 0 && (
              <View style={styles.commanderDamageContainer}>
                {getCommanderDamageDisplay(index).map((damage, idx) => (
                  <Text key={idx} style={styles.commanderDamageText}>
                    {damage}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <TouchableOpacity
            style={styles.commanderButton}
            onPress={(e) => {
              e.stopPropagation();
              openCommanderModal(index);
            }}
          >
            <Text style={styles.commanderButtonText}>CMD</Text>
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
                setCommanderDamage(Array(6).fill(null).map(() => Array(6).fill(0)));
                setGameStarted(false);
              }}
            >
              <Text>Home</Text>
            </TouchableOpacity>
          </>
        )}
        
        <Modal
          visible={showCommanderModal}
          animationType="slide"
          transparent={false}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Commander Damage for Player {selectedPlayer + 1}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCommanderModal(false)}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Set damage received from other players:
              </Text>
              
              {Array.from({ length: players }).map((_, fromPlayerIndex) => {
                if (fromPlayerIndex === selectedPlayer) return null;
                
                return (
                  <View key={fromPlayerIndex} style={styles.damageRow}>
                    <Text style={styles.damagePlayerText}>
                      From Player {fromPlayerIndex + 1}:
                    </Text>
                    <View style={styles.damageControls}>
                      <TouchableOpacity
                        style={styles.damageButton}
                        onPress={() => updateCommanderDamage(fromPlayerIndex, selectedPlayer, -1)}
                      >
                        <Text style={styles.damageButtonText}>-</Text>
                      </TouchableOpacity>
                      <Text style={styles.damageValue}>
                        {commanderDamage[selectedPlayer][fromPlayerIndex]}
                      </Text>
                      <TouchableOpacity
                        style={styles.damageButton}
                        onPress={() => updateCommanderDamage(fromPlayerIndex, selectedPlayer, 1)}
                      >
                        <Text style={styles.damageButtonText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </SafeAreaView>
        </Modal>
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
    position: "relative",
  },
  leftTouchArea: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 10,
    zIndex: 2,
  },
  rightTouchArea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 10,
    zIndex: 2,
  },
  topTouchArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 10,
    zIndex: 2,
  },
  bottomTouchArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 10,
    zIndex: 2,
  },
  decrementIndicator: {
    fontSize: 40,
    fontWeight: "bold",
    color: "rgba(0, 0, 0, 0.3)",
  },
  incrementIndicator: {
    fontSize: 40,
    fontWeight: "bold",
    color: "rgba(0, 0, 0, 0.3)",
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
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    minWidth: 120,
  },
  counterText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "black",
  },
  lifeBreakdownText: {
    fontSize: 12,
    color: "gray",
    fontStyle: "italic",
    marginTop: 2,
  },
  commanderDamageContainer: {
    marginTop: 5,
    alignItems: "center",
  },
  commanderDamageText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "red",
    marginVertical: 1,
  },
  commanderButton: {
    marginTop: 8,
    backgroundColor: "darkred",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    alignSelf: "center",
  },
  commanderButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "white",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    flex: 1,
  },
  closeButton: {
    backgroundColor: "white",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "black",
    fontWeight: "bold",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 16,
    color: "white",
    marginBottom: 20,
    textAlign: "center",
  },
  damageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: 15,
    marginVertical: 5,
    borderRadius: 8,
  },
  damagePlayerText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  damageControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  damageButton: {
    backgroundColor: "white",
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
  },
  damageButtonText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
  },
  damageValue: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    minWidth: 40,
    textAlign: "center",
  },
});
