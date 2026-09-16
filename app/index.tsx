import React, { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { useGameContext } from "./context/GameContext";

const MANA_COLORS = ["#F5F0DC", "#1E6FA9", "#4A4238", "#B23C2E", "#3F7A4C"];
const PLAYER_ACCENTS = [
  "#D8CFAF", // white mana
  "#4E8FBF", // blue
  "#9A8FA3", // black
  "#C05548", // red
  "#5B9668", // green
  "#C9A227", // gold
];

type CrossSlot = "top" | "left" | "right" | "bottom";
const CROSS_SLOTS: Record<number, CrossSlot[]> = {
  1: ["bottom"],
  2: ["top", "bottom"],
  3: ["top", "left", "right"],
  4: ["top", "left", "right", "bottom"],
};
const CROSS_ROTATIONS: Record<CrossSlot, string> = {
  top: "180deg",
  left: "90deg",
  right: "-90deg",
  bottom: "0deg",
};

// Normalized seat centers on screen, per layout, used to place commander
// damage tiles in the direction each opponent actually sits.
const GRID_POSITIONS: Record<number, [number, number][]> = {
  1: [[0, 0]],
  2: [[0, -1], [0, 1]],
  3: [[-1, -1], [1, -1], [0, 1]],
  4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  5: [[-1, -1], [1, -1], [-1, 0], [1, 0], [0, 1]],
  6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]],
};
const CROSS_POSITIONS: Record<CrossSlot, [number, number]> = {
  top: [0, -1],
  left: [-1, 0],
  right: [1, 0],
  bottom: [0, 1],
};

const COMMIT_DELAY_MS = 1800;
const POD_RING_SIZE = 148;
const SEAT_DOT_SIZE = 18;

export default function Index() {
  useKeepAwake();
  const { gameStarted, setGameStarted } = useGameContext();

  const [players, setPlayers] = useState(1);
  const [startingLife, setStartingLife] = useState(40);
  const [layoutMode, setLayoutMode] = useState<"table" | "cross">("table");
  const isCross = layoutMode === "cross" && players <= 4;

  const entrance = useRef(
    [0, 1, 2].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (gameStarted) return;
    entrance.forEach((v) => v.setValue(0));
    Animated.stagger(
      130,
      entrance.map((v) =>
        Animated.timing(v, { toValue: 1, duration: 550, useNativeDriver: true })
      )
    ).start();
  }, [gameStarted, entrance]);

  const entranceStyle = (i: number) => ({
    opacity: entrance[i],
    transform: [
      {
        translateY: entrance[i].interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  });

  const seatPosition = (index: number, count: number) => {
    const radius = POD_RING_SIZE / 2 - SEAT_DOT_SIZE / 2 - 4;
    if (layoutMode === "cross" && count <= 4) {
      const offsets: Record<CrossSlot, [number, number]> = {
        top: [0, -radius],
        left: [-radius, 0],
        right: [radius, 0],
        bottom: [0, radius],
      };
      const [x, y] = offsets[CROSS_SLOTS[count][index]];
      return { transform: [{ translateX: x }, { translateY: y }] };
    }
    const angle = (Math.PI * 2 * index) / count + Math.PI / 2;
    return {
      transform: [
        { translateX: radius * Math.cos(angle) },
        { translateY: radius * Math.sin(angle) },
      ],
    };
  };
  const [counters, setCounters] = useState(Array(6).fill(40));
  const [commanderDamage, setCommanderDamage] = useState(
    Array(6).fill(null).map(() => Array(6).fill(0))
  );
  const [cmdOpen, setCmdOpen] = useState<boolean[]>(Array(6).fill(false));
  const [pendingDeltas, setPendingDeltas] = useState<number[]>(Array(6).fill(0));
  const pendingRef = useRef<number[]>(Array(6).fill(0));
  const pendingTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(6).fill(null)
  );
  const [lifeLog, setLifeLog] = useState<{ player: number; delta: number }[]>([]);
  const [monarch, setMonarch] = useState<number | null>(null);
  const [initiative, setInitiative] = useState<number | null>(null);

  const updateCounter = (index: number, delta: number) => {
    setCounters((prev) => {
      const newCounters = [...prev];
      newCounters[index] += delta;
      return newCounters;
    });
    // Taps within COMMIT_DELAY_MS batch into one undoable log event.
    pendingRef.current[index] += delta;
    setPendingDeltas([...pendingRef.current]);
    const existing = pendingTimers.current[index];
    if (existing) clearTimeout(existing);
    pendingTimers.current[index] = setTimeout(() => {
      const amount = pendingRef.current[index];
      pendingRef.current[index] = 0;
      pendingTimers.current[index] = null;
      setPendingDeltas([...pendingRef.current]);
      if (amount !== 0) {
        setLifeLog((log) => [...log, { player: index, delta: amount }]);
      }
    }, COMMIT_DELAY_MS);
  };

  const holdIntervals = useRef<Record<string, ReturnType<typeof setInterval> | null>>({});

  const stopHold = (key: string) => {
    const interval = holdIntervals.current[key];
    if (interval) clearInterval(interval);
    holdIntervals.current[key] = null;
  };

  const startHold = (index: number, delta: number) => {
    const key = `${index}:${delta}`;
    stopHold(key);
    updateCounter(index, delta);
    holdIntervals.current[key] = setInterval(() => updateCounter(index, delta), 500);
  };

  const stopAllHolds = () => {
    Object.keys(holdIntervals.current).forEach(stopHold);
  };

  useEffect(() => stopAllHolds, []);

  const undoLast = () => {
    if (lifeLog.length === 0) return;
    const last = lifeLog[lifeLog.length - 1];
    setLifeLog(lifeLog.slice(0, -1));
    setCounters((prev) => {
      const next = [...prev];
      next[last.player] -= last.delta;
      return next;
    });
  };

  const resetGameState = () => {
    stopAllHolds();
    pendingTimers.current.forEach((t) => t && clearTimeout(t));
    pendingTimers.current = Array(6).fill(null);
    pendingRef.current = Array(6).fill(0);
    setPendingDeltas(Array(6).fill(0));
    setLifeLog([]);
    setMonarch(null);
    setInitiative(null);
    setCmdOpen(Array(6).fill(false));
  };

  const toggleCmd = (index: number) => {
    setCmdOpen((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
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
    if (isCross) return CROSS_ROTATIONS[CROSS_SLOTS[players][index]];
    const rotationMap: Record<number, string> = {
      0: players === 2 ? "180deg" : players === 1 ? "0deg" : "90deg",
      1: players === 2 ? "0deg" : "-90deg",
      2: players === 3 ? "0deg" : "90deg",
      3: "-90deg",
      4: players === 5 ? "0deg" : "90deg",
      5: "-90deg",
    };
    return rotationMap[index] || "0deg";
  };

  const seatScreenPos = (index: number): [number, number] =>
    isCross
      ? CROSS_POSITIONS[CROSS_SLOTS[players][index]]
      : GRID_POSITIONS[players][index];

  // Where an opponent sits relative to the viewer, in the viewer's own
  // orientation ("ahead", "to my left", ...), so CMD tiles can mirror the table.
  const toViewerFrame = (viewer: number, other: number): [number, number] => {
    const [vx, vy] = seatScreenPos(viewer);
    const [ox, oy] = seatScreenPos(other);
    const dx = ox - vx;
    const dy = oy - vy;
    const rot = getPlayerRotation(viewer);
    if (rot === "180deg") return [-dx, -dy];
    if (rot === "90deg") return [dy, -dx];
    if (rot === "-90deg") return [-dy, dx];
    return [dx, dy];
  };

  const spatialCmdRows = (viewer: number) => {
    const ahead: { from: number; fx: number }[] = [];
    const level: { from: number; fx: number }[] = [];
    const behind: { from: number; fx: number }[] = [];
    for (let from = 0; from < players; from++) {
      if (from === viewer) continue;
      const [fx, fy] = toViewerFrame(viewer, from);
      (fy < 0 ? ahead : fy === 0 ? level : behind).push({ from, fx });
    }
    return [ahead, level, behind]
      .map((row) => row.sort((a, b) => a.fx - b.fx).map((o) => o.from))
      .filter((row) => row.length > 0);
  };

  const isEliminated = (index: number) =>
    getAdjustedLifeTotal(index) <= 0 ||
    commanderDamage[index].some((dmg) => dmg >= 21);

  const renderCmdView = (index: number) => (
    <>
      <Text style={[styles.playerText, { color: PLAYER_ACCENTS[index] }]}>
        CMD · Life {getAdjustedLifeTotal(index)}
      </Text>
      {spatialCmdRows(index).map((row, rowIdx) => (
        <View key={rowIdx} style={styles.cmdTileRow}>
        {row.map((from) => {
          const dmg = commanderDamage[index][from];
          const lethal = dmg >= 21;
          return (
            <View
              key={from}
              style={[
                styles.cmdTile,
                lethal && styles.cmdTileLethal,
                {
                  borderColor: lethal
                    ? "#B23C2E"
                    : `${PLAYER_ACCENTS[from]}88`,
                },
              ]}
            >
              <TouchableOpacity
                style={styles.cmdTileButton}
                onPress={() => updateCommanderDamage(from, index, -1)}
                activeOpacity={0.6}
              >
                <Text style={styles.cmdTileButtonText}>-</Text>
              </TouchableOpacity>
              <View style={styles.cmdTileCenter}>
                <Text style={[styles.cmdTileLabel, { color: PLAYER_ACCENTS[from] }]}>
                  P{from + 1}
                </Text>
                <Text
                  style={[styles.cmdTileValue, lethal && styles.cmdTileValueLethal]}
                >
                  {dmg}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.cmdTileButton}
                onPress={() => updateCommanderDamage(from, index, 1)}
                activeOpacity={0.6}
              >
                <Text style={styles.cmdTileButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          );
        })}
        </View>
      ))}
      <TouchableOpacity
        style={styles.commanderButton}
        onPress={() => toggleCmd(index)}
        activeOpacity={0.7}
      >
        <Text style={styles.commanderButtonText}>DONE</Text>
      </TouchableOpacity>
    </>
  );

  const renderPlayerCard = (index: number, layoutStyle: any) => {
    const config = getRotationAwareTouchConfig(index);
    const rotation = getPlayerRotation(index);
    const inCmd = cmdOpen[index];
    const sideways = rotation === "90deg" || rotation === "-90deg";
    const eliminated = isEliminated(index);
    return (
      <View
        key={index}
        style={[
          styles.basePlayerContainer,
          layoutStyle,
          {
            borderColor: eliminated
              ? "rgba(232, 226, 208, 0.12)"
              : `${PLAYER_ACCENTS[index]}59`,
          },
        ]}
      >
        {!inCmd && (
          <>
            <TouchableOpacity
              style={config.decrementArea}
              onPress={config.decrementAction}
              onLongPress={() => startHold(index, -10)}
              delayLongPress={400}
              onPressOut={() => stopHold(`${index}:-10`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.decrementIndicator, { transform: [{ rotate: rotation }] }]}>-</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={config.incrementArea}
              onPress={config.incrementAction}
              onLongPress={() => startHold(index, 10)}
              delayLongPress={400}
              onPressOut={() => stopHold(`${index}:10`)}
              activeOpacity={0.7}
            >
              <Text style={[styles.incrementIndicator, { transform: [{ rotate: rotation }] }]}>+</Text>
            </TouchableOpacity>
          </>
        )}

        <View
          pointerEvents="box-none"
          style={[
            styles.cardContent,
            { transform: [{ rotate: rotation }] },
            inCmd && sideways && styles.cmdSideways,
            eliminated && !inCmd && styles.eliminatedContent,
          ]}
        >
          {inCmd ? (
            renderCmdView(index)
          ) : (
            <>
              <View pointerEvents="none">
              {eliminated && (
                <Text style={styles.defeatedText}>☠ DEFEATED</Text>
              )}
              <Text style={[styles.playerText, { color: PLAYER_ACCENTS[index] }]}>
                Player {index + 1}
              </Text>
              <View style={styles.counterContainer}>
                <Text style={styles.counterText}>{getAdjustedLifeTotal(index)}</Text>
                {pendingDeltas[index] !== 0 && (
                  <Text
                    style={[
                      styles.deltaChip,
                      {
                        color:
                          pendingDeltas[index] > 0 ? "#5B9668" : "#D66A5A",
                      },
                    ]}
                  >
                    {pendingDeltas[index] > 0
                      ? `+${pendingDeltas[index]}`
                      : pendingDeltas[index]}
                  </Text>
                )}
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
              </View>
              {players > 1 && (
                <View style={styles.cardActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tokenButton,
                      monarch === index && styles.tokenButtonActive,
                    ]}
                    onPress={() => setMonarch(monarch === index ? null : index)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tokenText,
                        monarch === index && styles.tokenTextActive,
                      ]}
                    >
                      ♛
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.commanderButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      toggleCmd(index);
                    }}
                  >
                    <Text style={styles.commanderButtonText}>CMD</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.tokenButton,
                      initiative === index && styles.tokenButtonActive,
                    ]}
                    onPress={() =>
                      setInitiative(initiative === index ? null : index)
                    }
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.tokenText,
                        initiative === index && styles.tokenTextActive,
                      ]}
                    >
                      ⚑
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  const renderGrid = () => {
    const anyStyles = styles as Record<string, any>;
    return Array.from({ length: players }).map((_, index) =>
      renderPlayerCard(index, [
        anyStyles[`playerContainer${players}`],
        index === 0 && anyStyles[`firstPlayerContainer${players}`],
        index === 1 && anyStyles[`secondPlayerContainer${players}`],
        index === 2 && anyStyles[`thirdPlayerContainer${players}`],
        index === 4 && anyStyles[`fourthPlayerContainer${players}`],
      ])
    );
  };

  const renderCross = () => {
    const slots = CROSS_SLOTS[players];
    const top = slots.indexOf("top");
    const left = slots.indexOf("left");
    const right = slots.indexOf("right");
    const bottom = slots.indexOf("bottom");
    return (
      <View style={styles.crossContainer}>
        {top !== -1 && renderPlayerCard(top, styles.crossEdgeCard)}
        {(left !== -1 || right !== -1) && (
          <View style={styles.crossMiddleRow}>
            {left !== -1 && renderPlayerCard(left, styles.crossSideCard)}
            {right !== -1 && renderPlayerCard(right, styles.crossSideCard)}
          </View>
        )}
        {bottom !== -1 && renderPlayerCard(bottom, styles.crossEdgeCard)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {!gameStarted ? (
          <View style={styles.startContainer}>
            <View pointerEvents="none" style={styles.backdrop}>
              <View style={[styles.arcaneRing, styles.arcaneRingOuter]} />
              <View style={[styles.arcaneRing, styles.arcaneRingMiddle]} />
              <View style={[styles.arcaneRing, styles.arcaneRingInner]} />
            </View>

            <Animated.View style={[styles.heroBlock, entranceStyle(0)]}>
              <Text style={styles.eyebrow}>✦ COMMANDER ✦</Text>
              <Text style={styles.homeTitle}>LIFE{"\n"}COUNTER</Text>
              <View style={styles.manaRow}>
                {MANA_COLORS.map((color) => (
                  <View
                    key={color}
                    style={[styles.manaDot, { backgroundColor: color }]}
                  />
                ))}
              </View>
            </Animated.View>

            <Animated.View style={[styles.podBlock, entranceStyle(1)]}>
              <View style={styles.podRing}>
                <View style={styles.podTable}>
                  <Text style={styles.podLife}>{startingLife}</Text>
                  <Text style={styles.podLifeLabel}>LIFE</Text>
                </View>
                {Array.from({ length: players }).map((_, i) => (
                  <View
                    key={i}
                    style={[styles.seatDot, seatPosition(i, players)]}
                  />
                ))}
              </View>

              <Text style={styles.seatLabel}>PLAYERS AT THE TABLE</Text>
              <View style={styles.seatRow}>
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.seatChip, players === n && styles.seatChipActive]}
                    onPress={() => {
                      setPlayers(n);
                      if (n > 4) setLayoutMode("table");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.seatChipText,
                        players === n && styles.seatChipTextActive,
                      ]}
                    >
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.seatLabel}>STARTING LIFE</Text>
              <View style={styles.seatRow}>
                {[20, 30, 40].map((life) => (
                  <TouchableOpacity
                    key={life}
                    style={[
                      styles.lifeChip,
                      startingLife === life && styles.seatChipActive,
                    ]}
                    onPress={() => setStartingLife(life)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.seatChipText,
                        startingLife === life && styles.seatChipTextActive,
                      ]}
                    >
                      {life}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.seatLabel}>SEAT LAYOUT</Text>
              <View style={styles.seatRow}>
                {(
                  [
                    { mode: "table", label: "GRID" },
                    { mode: "cross", label: "CROSS" },
                  ] as const
                ).map(({ mode, label }) => {
                  const disabled = mode === "cross" && players > 4;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.lifeChip,
                        layoutMode === mode && styles.seatChipActive,
                        disabled && styles.chipDisabled,
                      ]}
                      onPress={() => !disabled && setLayoutMode(mode)}
                      activeOpacity={disabled ? 1 : 0.7}
                    >
                      <Text
                        style={[
                          styles.layoutChipText,
                          layoutMode === mode && styles.seatChipTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>

            <Animated.View style={[styles.beginBlock, entranceStyle(2)]}>
              <TouchableOpacity
                style={styles.beginButton}
                onPress={() => {
                  setCounters(Array(6).fill(startingLife));
                  resetGameState();
                  setGameStarted(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.beginButtonText}>BEGIN GAME</Text>
              </TouchableOpacity>
              <Text style={styles.footnote}>
                Tap either side of a seat to adjust life
              </Text>
            </Animated.View>
          </View>
        ) : (
          <>
            {isCross ? (
              renderCross()
            ) : (
              <View
                style={
                  players !== 2
                    ? styles.gridContainer
                    : styles.twoPlayerGridContainer
                }
              >
                {renderGrid()}
              </View>
            )}
            <View style={styles.bottomBar}>
              <TouchableOpacity
                style={[
                  styles.homeButton,
                  styles.undoButton,
                  lifeLog.length === 0 && styles.chipDisabled,
                ]}
                onPress={undoLast}
                activeOpacity={lifeLog.length === 0 ? 1 : 0.7}
              >
                <Text style={styles.homeButtonText}>↺ UNDO</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.homeButton, styles.endButton]}
                onPress={() => {
                  setPlayers(1);
                  setCounters(Array(6).fill(startingLife));
                  setCommanderDamage(Array(6).fill(null).map(() => Array(6).fill(0)));
                  resetGameState();
                  setGameStarted(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.homeButtonText}>✦ END GAME ✦</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0A0C08",
  },
  container: {
    flex: 1,
    backgroundColor: "#0A0C08",
  },
  startContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingVertical: 20,
    paddingHorizontal: 28,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  arcaneRing: {
    position: "absolute",
    borderColor: "#C9A227",
    borderWidth: 1,
  },
  arcaneRingOuter: {
    width: 560,
    height: 560,
    borderRadius: 280,
    opacity: 0.05,
  },
  arcaneRingMiddle: {
    width: 430,
    height: 430,
    borderRadius: 215,
    opacity: 0.08,
    borderStyle: "dashed",
  },
  arcaneRingInner: {
    width: 310,
    height: 310,
    borderRadius: 155,
    opacity: 0.06,
  },
  heroBlock: {
    alignItems: "center",
  },
  eyebrow: {
    color: "#B39847",
    fontSize: 11,
    letterSpacing: 6,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  homeTitle: {
    color: "#E8E2D0",
    fontSize: 42,
    lineHeight: 46,
    textAlign: "center",
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: "Copperplate", default: "serif" }),
    fontWeight: "700",
  },
  manaRow: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14,
  },
  manaDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(232, 226, 208, 0.4)",
  },
  podBlock: {
    alignItems: "center",
  },
  podRing: {
    width: POD_RING_SIZE,
    height: POD_RING_SIZE,
    borderRadius: POD_RING_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(201, 162, 39, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  podTable: {
    width: POD_RING_SIZE - 58,
    height: POD_RING_SIZE - 58,
    borderRadius: (POD_RING_SIZE - 58) / 2,
    backgroundColor: "#12150F",
    borderWidth: 1,
    borderColor: "rgba(201, 162, 39, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  podLife: {
    color: "#E8E2D0",
    fontSize: 28,
    fontFamily: Platform.select({ ios: "Copperplate", default: "serif" }),
    fontWeight: "700",
  },
  podLifeLabel: {
    color: "#6B6455",
    fontSize: 10,
    letterSpacing: 4,
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  seatDot: {
    position: "absolute",
    width: SEAT_DOT_SIZE,
    height: SEAT_DOT_SIZE,
    borderRadius: SEAT_DOT_SIZE / 2,
    backgroundColor: "#C9A227",
    borderWidth: 2,
    borderColor: "#0A0C08",
  },
  seatLabel: {
    color: "#6B6455",
    fontSize: 11,
    letterSpacing: 4,
    marginTop: 16,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  seatRow: {
    flexDirection: "row",
    gap: 10,
  },
  seatChip: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(232, 226, 208, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatChipActive: {
    backgroundColor: "#C9A227",
    borderColor: "#C9A227",
  },
  seatChipText: {
    color: "#E8E2D0",
    fontSize: 17,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  seatChipTextActive: {
    color: "#0A0C08",
  },
  lifeChip: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(232, 226, 208, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  layoutChipText: {
    color: "#E8E2D0",
    fontSize: 12,
    letterSpacing: 2,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  chipDisabled: {
    opacity: 0.3,
  },
  crossContainer: {
    flex: 1,
    flexDirection: "column",
    marginTop: 20,
  },
  crossEdgeCard: {
    flex: 1,
    flexBasis: "auto",
    alignSelf: "stretch",
    justifyContent: "center",
  },
  crossMiddleRow: {
    flex: 1.5,
    flexDirection: "row",
    alignSelf: "stretch",
  },
  crossSideCard: {
    flex: 1,
    flexBasis: "auto",
    justifyContent: "center",
  },
  beginBlock: {
    width: "100%",
    alignItems: "center",
  },
  beginButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "#C9A227",
    alignItems: "center",
  },
  beginButtonText: {
    color: "#0A0C08",
    fontSize: 16,
    letterSpacing: 5,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "700",
  },
  footnote: {
    color: "#6B6455",
    fontSize: 12,
    marginTop: 14,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  bottomBar: {
    flexDirection: "row",
    marginVertical: 10,
    marginHorizontal: 20,
    gap: 10,
  },
  homeButton: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 162, 39, 0.4)",
  },
  undoButton: {
    flex: 1,
  },
  endButton: {
    flex: 2,
  },
  homeButtonText: {
    color: "#B39847",
    fontSize: 12,
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  gridContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
  },
  twoPlayerGridContainer: {
    flex: 1,
    flexDirection: "column",
    marginTop: 20,
  },
  basePlayerContainer: {
    backgroundColor: "#12150F",
    borderColor: "rgba(232, 226, 208, 0.2)",
    borderWidth: 1,
    borderRadius: 20,
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
    fontWeight: "300",
    color: "rgba(232, 226, 208, 0.25)",
  },
  incrementIndicator: {
    fontSize: 40,
    fontWeight: "300",
    color: "rgba(232, 226, 208, 0.25)",
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
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  counterContainer: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 80,
    minWidth: 120,
  },
  counterText: {
    fontSize: 64,
    color: "#E8E2D0",
    fontFamily: Platform.select({ ios: "Copperplate", default: "serif" }),
    fontWeight: "700",
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
    color: "#D66A5A",
    marginVertical: 1,
  },
  commanderButton: {
    backgroundColor: "rgba(201, 162, 39, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(201, 162, 39, 0.45)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    alignSelf: "center",
  },
  commanderButtonText: {
    color: "#C9A227",
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: "600",
  },
  cmdTileRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 6,
    marginVertical: 8,
    maxWidth: 280,
  },
  cmdTile: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    backgroundColor: "rgba(232, 226, 208, 0.04)",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  cmdTileButton: {
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  cmdTileButtonText: {
    color: "rgba(232, 226, 208, 0.6)",
    fontSize: 18,
    fontWeight: "600",
  },
  cmdTileCenter: {
    alignItems: "center",
    minWidth: 26,
  },
  cmdTileLethal: {
    backgroundColor: "rgba(178, 60, 46, 0.18)",
  },
  cmdSideways: {
    width: 260,
  },
  cardContent: {
    zIndex: 3,
  },
  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 8,
  },
  tokenButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(232, 226, 208, 0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  tokenButtonActive: {
    borderColor: "#C9A227",
    backgroundColor: "rgba(201, 162, 39, 0.18)",
  },
  tokenText: {
    color: "rgba(232, 226, 208, 0.3)",
    fontSize: 15,
  },
  tokenTextActive: {
    color: "#C9A227",
  },
  deltaChip: {
    position: "absolute",
    right: -14,
    top: 6,
    fontSize: 16,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  defeatedText: {
    color: "#D66A5A",
    fontSize: 11,
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 2,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  eliminatedContent: {
    opacity: 0.4,
  },
  cmdTileLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "700",
  },
  cmdTileValue: {
    color: "#E8E2D0",
    fontSize: 18,
    fontFamily: Platform.select({ ios: "Copperplate", default: "serif" }),
    fontWeight: "700",
  },
  cmdTileValueLethal: {
    color: "#D66A5A",
  },
});
