import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import {
  CROSS_SLOTS,
  PLAYER_ACCENTS,
  type CrossSlot,
  type GameConfig,
  type LayoutMode,
} from "../lib/game";

const MANA_COLORS = ["#F5F0DC", "#1E6FA9", "#4A4238", "#FF6B5A", "#3F7A4C"];
const POD_RING_SIZE = 148;
const SEAT_DOT_SIZE = 18;

type HomeScreenProps = {
  onBegin: (config: GameConfig) => void;
};

export const HomeScreen = ({ onBegin }: HomeScreenProps) => {
  const [players, setPlayers] = useState(4);
  const [startingLife, setStartingLife] = useState(40);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("table");

  const entrance = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      130,
      entrance.map((v) =>
        Animated.timing(v, { toValue: 1, duration: 550, useNativeDriver: true })
      )
    ).start();
  }, [entrance]);

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

  return (
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
            <View key={color} style={[styles.manaDot, { backgroundColor: color }]} />
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
                style={[styles.seatChipText, players === n && styles.seatChipTextActive]}
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
              style={[styles.lifeChip, startingLife === life && styles.seatChipActive]}
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
          onPress={() => onBegin({ players, startingLife, layoutMode })}
          activeOpacity={0.8}
        >
          <Text style={styles.beginButtonText}>BEGIN GAME</Text>
        </TouchableOpacity>
        <Text style={styles.footnote}>Tap either side of a seat to adjust life</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
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
});
