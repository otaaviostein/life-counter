import React, { useEffect, useRef, useState } from "react";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { useFonts, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import {
  Alert,
  Animated,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { useGameContext } from "./context/GameContext";

const MANA_COLORS = ["#F5F0DC", "#1E6FA9", "#4A4238", "#FF6B5A", "#3F7A4C"];
const PLAYER_ACCENTS = [
  "#E3D9BB", // ivory
  "#62A9E3", // azure
  "#A78FD9", // amethyst
  "#E0655A", // garnet
  "#66BB88", // moss
  "#D678B4", // orchid
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

// Row structure of the grid board per player count; every card flexes evenly.
const BOARD_ROWS: Record<number, number[][]> = {
  1: [[0]],
  2: [[0], [1]],
  3: [[0, 1], [2]],
  4: [[0, 1], [2, 3]],
  5: [[0, 1], [2, 3], [4]],
  6: [[0, 1], [2, 3], [4, 5]],
};
const POD_RING_SIZE = 148;
const SEAT_DOT_SIZE = 18;

export default function Index() {
  useKeepAwake();
  const [fontsLoaded] = useFonts({ Nunito_800ExtraBold });
  const { gameStarted, setGameStarted } = useGameContext();

  const [players, setPlayers] = useState(4);
  const [startingLife, setStartingLife] = useState(40);
  const [layoutMode, setLayoutMode] = useState<"table" | "cross">("table");
  const isCross = layoutMode === "cross" && players <= 4;

  const entrance = useRef(
    [0, 1, 2].map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    if (gameStarted) return;
    // Values are reset to 0 before gameStarted flips (see resetGameState),
    // so the home screen never paints a fully-visible frame before animating.
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
  const [poison, setPoison] = useState<number[]>(Array(6).fill(0));

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
    entrance.forEach((v) => v.setValue(0));
    stopAllHolds();
    pendingTimers.current.forEach((t) => t && clearTimeout(t));
    pendingTimers.current = Array(6).fill(null);
    pendingRef.current = Array(6).fill(0);
    setPendingDeltas(Array(6).fill(0));
    setLifeLog([]);
    setPoison(Array(6).fill(0));
    setCmdOpen(Array(6).fill(false));
  };

  const lightTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const updatePoison = (index: number, delta: number) => {
    lightTap();
    setPoison((prev) => {
      const next = [...prev];
      next[index] = Math.min(10, Math.max(0, next[index] + delta));
      return next;
    });
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
    poison[index] >= 10 ||
    commanderDamage[index].some((dmg) => dmg >= 21);

  if (!fontsLoaded) return null;

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
                    ? "#FF6B5A"
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
    // The seat owner's bottom-right corner, mapped to screen coordinates.
    const chipCorner =
      rotation === "90deg"
        ? { bottom: 12, left: 12 }
        : rotation === "-90deg"
          ? { top: 12, right: 12 }
          : rotation === "180deg"
            ? { top: 12, left: 12 }
            : { bottom: 12, right: 12 };
    return (
      <View
        key={index}
        style={[
          styles.basePlayerContainer,
          layoutStyle,
          {
            borderColor: eliminated
              ? "rgba(236, 230, 217, 0.12)"
              : `${PLAYER_ACCENTS[index]}8C`,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.seatTint,
            { backgroundColor: `${PLAYER_ACCENTS[index]}21` },
          ]}
        />
        {!inCmd && (
          <>
            <Pressable
              style={({ pressed }) => [
                config.decrementArea,
                pressed && styles.halfPressed,
              ]}
              onPress={config.decrementAction}
              onLongPress={() => startHold(index, -10)}
              delayLongPress={400}
              onPressOut={() => stopHold(`${index}:-10`)}
            >
              <Text style={[styles.decrementIndicator, { transform: [{ rotate: rotation }] }]}>-</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                config.incrementArea,
                pressed && styles.halfPressed,
              ]}
              onPress={config.incrementAction}
              onLongPress={() => startHold(index, 10)}
              delayLongPress={400}
              onPressOut={() => stopHold(`${index}:10`)}
            >
              <Text style={[styles.incrementIndicator, { transform: [{ rotate: rotation }] }]}>+</Text>
            </Pressable>
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
              <Text style={[styles.playerText, { color: PLAYER_ACCENTS[index] }]}>
                Player {index + 1}
              </Text>
              <View style={styles.counterContainer}>
                <Text
                  style={[
                    styles.counterText,
                    sideways && styles.counterTextSideways,
                    !eliminated &&
                      getAdjustedLifeTotal(index) < 10 && { color: "#FF6B5A" },
                  ]}
                >
                  {getAdjustedLifeTotal(index)}
                </Text>
                {pendingDeltas[index] !== 0 && (
                  <Text
                    style={[
                      styles.deltaChip,
                      pendingDeltas[index] > 0
                        ? {
                            backgroundColor: "rgba(102, 187, 136, 0.18)",
                            color: "#8ADBA8",
                          }
                        : {
                            backgroundColor: "rgba(255, 107, 90, 0.18)",
                            color: "#FF8B7A",
                          },
                    ]}
                  >
                    {pendingDeltas[index] > 0
                      ? `+${pendingDeltas[index]}`
                      : pendingDeltas[index]}
                  </Text>
                )}
                {commanderDamage[index].some(
                  (dmg, from) => from < players && dmg > 0
                ) && (
                  <View style={styles.cmdChipsRow}>
                    {commanderDamage[index].map((dmg, from) =>
                      from < players && from !== index && dmg > 0 ? (
                        <Text
                          key={from}
                          style={[
                            styles.cmdChip,
                            dmg >= 21
                              ? {
                                  backgroundColor: "rgba(255, 107, 90, 0.2)",
                                  color: "#FF6B5A",
                                }
                              : {
                                  backgroundColor: `${PLAYER_ACCENTS[from]}33`,
                                  color: PLAYER_ACCENTS[from],
                                },
                          ]}
                        >
                          P{from + 1} {dmg}
                        </Text>
                      ) : null
                    )}
                  </View>
                )}
              </View>
              </View>
              {players > 1 && (
                <TouchableOpacity
                  style={styles.commanderButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleCmd(index);
                  }}
                >
                  <Text style={styles.commanderButtonText}>CMD</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {!inCmd && (
          <Pressable
            style={({ pressed }) => [
              styles.poisonChip,
              chipCorner,
              { transform: [{ rotate: rotation }] },
              poison[index] > 0 && styles.poisonChipActive,
              poison[index] >= 10 && styles.poisonChipLethal,
              eliminated && styles.eliminatedContent,
              pressed && styles.chipPressed,
            ]}
            onPress={() => updatePoison(index, 1)}
            onLongPress={() => updatePoison(index, -1)}
            delayLongPress={400}
            accessibilityLabel={`Poison: ${poison[index]}. Tap to add.`}
          >
            <Image
              source={require("../assets/images/phyrexian.png")}
              style={[
                styles.poisonChipIcon,
                poison[index] > 0 && { tintColor: "#66BB88" },
                poison[index] >= 10 && { tintColor: "#FF6B5A" },
              ]}
            />
            <Text
              style={[
                styles.poisonChipCount,
                poison[index] === 0 && styles.poisonChipMuted,
                poison[index] >= 10 && { color: "#FF6B5A" },
              ]}
            >
              {poison[index]}
            </Text>
            {poison[index] > 0 && (
              <Pressable
                style={({ pressed }) => [
                  styles.poisonBadge,
                  pressed && styles.chipPressed,
                ]}
                hitSlop={8}
                onPress={() => updatePoison(index, -1)}
                accessibilityLabel="Remove one poison"
              >
                <Text style={styles.poisonBadgeText}>-</Text>
              </Pressable>
            )}
          </Pressable>
        )}
      </View>
    );
  };

  const renderGrid = () => (
    <View style={styles.board}>
      {BOARD_ROWS[players].map((row, rowIdx) => (
        <View key={rowIdx} style={styles.boardRow}>
          {row.map((idx) => renderPlayerCard(idx, styles.boardCard))}
        </View>
      ))}
    </View>
  );

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
                    style={[
                      styles.seatDot,
                      seatPosition(i, players),
                      { backgroundColor: PLAYER_ACCENTS[i] },
                    ]}
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
            {isCross ? renderCross() : renderGrid()}
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
                  Alert.alert(
                    "End game?",
                    "Life totals and commander damage will be reset.",
                    [
                      { text: "Keep playing", style: "cancel" },
                      {
                        text: "End game",
                        style: "destructive",
                        onPress: () => {
                          setCounters(Array(6).fill(startingLife));
                          setCommanderDamage(
                            Array(6).fill(null).map(() => Array(6).fill(0))
                          );
                          resetGameState();
                          setGameStarted(false);
                        },
                      },
                    ]
                  );
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
    backgroundColor: "#0C0F13",
  },
  container: {
    flex: 1,
    backgroundColor: "#0C0F13",
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
    borderColor: "#ECE6D9",
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
    color: "#93989F",
    fontSize: 11,
    letterSpacing: 6,
    marginBottom: 10,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  homeTitle: {
    color: "#ECE6D9",
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
    borderColor: "rgba(236, 230, 217, 0.4)",
  },
  podBlock: {
    alignItems: "center",
  },
  podRing: {
    width: POD_RING_SIZE,
    height: POD_RING_SIZE,
    borderRadius: POD_RING_SIZE / 2,
    borderWidth: 1,
    borderColor: "rgba(236, 230, 217, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  podTable: {
    width: POD_RING_SIZE - 58,
    height: POD_RING_SIZE - 58,
    borderRadius: (POD_RING_SIZE - 58) / 2,
    backgroundColor: "#141922",
    borderWidth: 1,
    borderColor: "rgba(236, 230, 217, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  podLife: {
    color: "#ECE6D9",
    fontSize: 28,
    fontFamily: "Nunito_800ExtraBold",
  },
  podLifeLabel: {
    color: "#8A8F98",
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
    borderWidth: 2,
    borderColor: "#0C0F13",
  },
  seatLabel: {
    color: "#8A8F98",
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
    borderColor: "rgba(236, 230, 217, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  seatChipActive: {
    backgroundColor: "#ECE6D9",
    borderColor: "#ECE6D9",
  },
  seatChipText: {
    color: "#ECE6D9",
    fontSize: 17,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  seatChipTextActive: {
    color: "#0C0F13",
  },
  lifeChip: {
    paddingHorizontal: 20,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(236, 230, 217, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  layoutChipText: {
    color: "#ECE6D9",
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
    padding: 6,
    marginTop: 20,
    gap: 6,
  },
  crossEdgeCard: {
    flex: 1,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  crossMiddleRow: {
    flex: 1.5,
    flexDirection: "row",
    alignSelf: "stretch",
    gap: 6,
  },
  crossSideCard: {
    flex: 1,
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
    backgroundColor: "#ECE6D9",
    alignItems: "center",
  },
  beginButtonText: {
    color: "#0C0F13",
    fontSize: 16,
    letterSpacing: 5,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "700",
  },
  footnote: {
    color: "#8A8F98",
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
    paddingVertical: 16,
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.3)",
  },
  undoButton: {
    flex: 1,
  },
  endButton: {
    flex: 2,
  },
  homeButtonText: {
    color: "#93989F",
    fontSize: 12,
    letterSpacing: 4,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  board: {
    flex: 1,
    padding: 6,
    marginTop: 20,
    gap: 6,
  },
  boardRow: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
  },
  boardCard: {
    flex: 1,
    justifyContent: "center",
  },
  basePlayerContainer: {
    backgroundColor: "#141922",
    borderColor: "rgba(236, 230, 217, 0.2)",
    borderWidth: 1.5,
    borderRadius: 24,
    alignItems: "center",
    padding: 8,
    position: "relative",
  },
  leftTouchArea: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  rightTouchArea: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: "50%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  topTouchArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  bottomTouchArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  decrementIndicator: {
    fontSize: 44,
    fontWeight: "400",
    color: "rgba(236, 230, 217, 0.38)",
  },
  incrementIndicator: {
    fontSize: 44,
    fontWeight: "400",
    color: "rgba(236, 230, 217, 0.38)",
  },
  seatTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  halfPressed: {
    backgroundColor: "rgba(236, 230, 217, 0.07)",
    borderRadius: 22,
  },
  playerText: {
    fontSize: 12,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 10,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
    fontWeight: "600",
  },
  counterContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  counterText: {
    fontSize: 96,
    lineHeight: 110,
    color: "#ECE6D9",
    fontFamily: "Nunito_800ExtraBold",
  },
  counterTextSideways: {
    fontSize: 78,
    lineHeight: 90,
  },
  lifeBreakdownText: {
    fontSize: 12,
    color: "gray",
    fontStyle: "italic",
    marginTop: 2,
  },
  cmdChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 4,
    marginTop: 4,
    maxWidth: 200,
  },
  cmdChip: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 9,
    overflow: "hidden",
  },
  commanderButton: {
    backgroundColor: "rgba(236, 230, 217, 0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.35)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 22,
    alignSelf: "center",
    marginTop: 6,
  },
  commanderButtonText: {
    color: "#ECE6D9",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "700",
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
    backgroundColor: "rgba(236, 230, 217, 0.04)",
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  cmdTileButton: {
    paddingHorizontal: 7,
    paddingVertical: 8,
  },
  cmdTileButtonText: {
    color: "rgba(236, 230, 217, 0.6)",
    fontSize: 18,
    fontWeight: "600",
  },
  cmdTileCenter: {
    alignItems: "center",
    minWidth: 26,
  },
  cmdTileLethal: {
    backgroundColor: "rgba(255, 107, 90, 0.18)",
  },
  cmdSideways: {
    width: 260,
  },
  cardContent: {
    zIndex: 3,
  },
  poisonChip: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  poisonChipActive: {
    borderColor: "#66BB88",
    backgroundColor: "rgba(102, 187, 136, 0.16)",
  },
  poisonChipLethal: {
    borderColor: "#FF6B5A",
    backgroundColor: "rgba(255, 107, 90, 0.16)",
  },
  poisonChipIcon: {
    width: 13,
    height: 23,
    tintColor: "rgba(236, 230, 217, 0.35)",
    marginBottom: 1,
  },
  poisonChipCount: {
    color: "#ECE6D9",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
  poisonChipMuted: {
    color: "rgba(236, 230, 217, 0.35)",
  },
  chipPressed: {
    opacity: 0.55,
  },
  poisonBadge: {
    position: "absolute",
    top: -7,
    right: -7,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#2A3242",
    borderWidth: 1,
    borderColor: "rgba(236, 230, 217, 0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  poisonBadgeText: {
    color: "#ECE6D9",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 16,
  },
  deltaChip: {
    position: "absolute",
    right: -14,
    top: 2,
    height: 22,
    fontSize: 12,
    fontWeight: "800",
    paddingHorizontal: 9,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
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
    color: "#ECE6D9",
    fontSize: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
  cmdTileValueLethal: {
    color: "#FF6B5A",
  },
});
