import { useEffect, useRef, useState } from "react";
import * as Haptics from "expo-haptics";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { BOARD_ROWS, CROSS_SLOTS, type GameConfig } from "../lib/game";
import { PlayerCard } from "./player-card";

// Taps within this window batch into one pending-delta chip.
const COMMIT_DELAY_MS = 1800;

type GameBoardProps = {
  config: GameConfig;
  onHome: () => void;
};

export const GameBoard = ({ config, onHome }: GameBoardProps) => {
  const { players, startingLife } = config;
  const isCross = config.layoutMode === "cross" && players <= 4;

  const [counters, setCounters] = useState(() => Array(6).fill(startingLife));
  const [commanderDamage, setCommanderDamage] = useState(() =>
    Array(6).fill(null).map(() => Array(6).fill(0))
  );
  // Player currently entering commander damage they received, or null.
  const [cmdFor, setCmdFor] = useState<number | null>(null);
  const [pendingDeltas, setPendingDeltas] = useState<number[]>(Array(6).fill(0));
  const pendingRef = useRef<number[]>(Array(6).fill(0));
  const pendingTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>(
    Array(6).fill(null)
  );
  const [poison, setPoison] = useState<number[]>(Array(6).fill(0));
  const [menuOpen, setMenuOpen] = useState(false);

  const lightTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const updateCounter = (index: number, delta: number) => {
    setCounters((prev) => {
      const newCounters = [...prev];
      newCounters[index] += delta;
      return newCounters;
    });
    pendingRef.current[index] += delta;
    setPendingDeltas([...pendingRef.current]);
    const existing = pendingTimers.current[index];
    if (existing) clearTimeout(existing);
    pendingTimers.current[index] = setTimeout(() => {
      pendingRef.current[index] = 0;
      pendingTimers.current[index] = null;
      setPendingDeltas([...pendingRef.current]);
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

  const clearPendingTimers = () => {
    pendingTimers.current.forEach((t) => t && clearTimeout(t));
    pendingTimers.current = Array(6).fill(null);
  };

  useEffect(
    () => () => {
      stopAllHolds();
      clearPendingTimers();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const resetGame = () => {
    stopAllHolds();
    clearPendingTimers();
    pendingRef.current = Array(6).fill(0);
    setPendingDeltas(Array(6).fill(0));
    setCounters(Array(6).fill(startingLife));
    setCommanderDamage(Array(6).fill(null).map(() => Array(6).fill(0)));
    setPoison(Array(6).fill(0));
    setCmdFor(null);
    setMenuOpen(false);
  };

  const updatePoison = (index: number, delta: number) => {
    lightTap();
    setPoison((prev) => {
      const next = [...prev];
      next[index] = Math.min(10, Math.max(0, next[index] + delta));
      return next;
    });
  };

  const updateCommanderDamage = (fromPlayer: number, toPlayer: number, delta: number) => {
    lightTap();
    setCommanderDamage((prev) => {
      const newDamage = prev.map((row) => [...row]);
      newDamage[toPlayer][fromPlayer] = Math.max(0, newDamage[toPlayer][fromPlayer] + delta);
      return newDamage;
    });
  };

  const getAdjustedLifeTotal = (index: number) =>
    counters[index] - commanderDamage[index].reduce((total, damage) => total + damage, 0);

  const isEliminated = (index: number) =>
    getAdjustedLifeTotal(index) <= 0 ||
    poison[index] >= 10 ||
    commanderDamage[index].some((dmg) => dmg >= 21);

  const renderPlayerCard = (index: number, layoutStyle: StyleProp<ViewStyle>) => (
    <PlayerCard
      key={index}
      index={index}
      players={players}
      isCross={isCross}
      style={layoutStyle}
      life={getAdjustedLifeTotal(index)}
      pendingDelta={pendingDeltas[index]}
      poison={poison[index]}
      damageTaken={commanderDamage[index]}
      damageToReceiver={cmdFor !== null ? commanderDamage[cmdFor][index] : 0}
      eliminated={isEliminated(index)}
      cmdFor={cmdFor}
      onLife={(delta) => updateCounter(index, delta)}
      onLifeHold={(delta) => startHold(index, delta)}
      onLifeHoldEnd={(delta) => stopHold(`${index}:${delta}`)}
      onPoison={(delta) => updatePoison(index, delta)}
      onCmdDamage={(delta) =>
        cmdFor !== null && updateCommanderDamage(index, cmdFor, delta)
      }
      onCmdOpen={() => {
        lightTap();
        setCmdFor(index);
      }}
      onCmdClose={() => setCmdFor(null)}
    />
  );

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
    <View style={styles.gameArea}>
      {isCross ? renderCross() : renderGrid()}
      <View pointerEvents="box-none" style={styles.centerOverlay}>
        <TouchableOpacity
          style={styles.endOrb}
          onPress={() => {
            lightTap();
            setMenuOpen(true);
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.endOrbText}>✦</Text>
        </TouchableOpacity>
      </View>

      {menuOpen && (
        <View style={styles.menuLayer}>
          <Pressable style={styles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={styles.menuCard}>
            <Text style={styles.menuTitle}>✦ GAME MENU ✦</Text>
            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonDanger]}
              onPress={resetGame}
              activeOpacity={0.7}
            >
              <Text style={[styles.menuButtonText, { color: "#FF6B5A" }]}>
                RESET GAME
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuButton} onPress={onHome} activeOpacity={0.7}>
              <Text style={styles.menuButtonText}>BACK TO HOME</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuCancel}
              onPress={() => setMenuOpen(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.menuCancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  gameArea: {
    flex: 1,
  },
  board: {
    flex: 1,
    padding: 6,
    marginTop: 20,
    marginBottom: 10,
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
  crossContainer: {
    flex: 1,
    flexDirection: "column",
    padding: 6,
    marginTop: 20,
    marginBottom: 10,
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
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  endOrb: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#141922",
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  endOrbText: {
    color: "#93989F",
    fontSize: 18,
    fontWeight: "600",
  },
  menuLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(12, 15, 19, 0.78)",
  },
  menuCard: {
    width: 260,
    backgroundColor: "#141922",
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.18)",
    borderRadius: 20,
    padding: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  menuTitle: {
    color: "#93989F",
    fontSize: 11,
    letterSpacing: 3,
    textAlign: "center",
    fontWeight: "700",
    marginBottom: 4,
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  menuButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.3)",
    alignItems: "center",
  },
  menuButtonDanger: {
    borderColor: "rgba(255, 107, 90, 0.5)",
    backgroundColor: "rgba(255, 107, 90, 0.1)",
  },
  menuButtonText: {
    color: "#ECE6D9",
    fontSize: 13,
    letterSpacing: 2,
    fontWeight: "700",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  menuCancel: {
    paddingVertical: 8,
    alignItems: "center",
  },
  menuCancelText: {
    color: "#93989F",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
});
