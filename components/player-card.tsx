import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRef, useState, type ReactNode } from "react";
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

import { PLAYER_ACCENTS, getPlayerRotation, type Rotation } from "../lib/game";

const HOLD_DELAY_MS = 400;

type TouchHalfProps = {
  area: StyleProp<ViewStyle>;
  onTap: () => void;
  onHold?: () => void;
  onRelease?: () => void;
  children: ReactNode;
};

// Raw touch events instead of Pressable: RN's responder system (and iOS
// gesture recognizers) only allow one active press per window, which broke
// several players adjusting life at the same time. Touch events are
// delivered per view with no global arbitration.
const TouchHalf = ({ area, onTap, onHold, onRelease, children }: TouchHalfProps) => {
  const [pressed, setPressed] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holding = useRef(false);

  const start = () => {
    setPressed(true);
    if (onHold) {
      holding.current = false;
      holdTimer.current = setTimeout(() => {
        holding.current = true;
        onHold();
      }, HOLD_DELAY_MS);
    }
  };

  const end = (cancelled: boolean) => {
    setPressed(false);
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (holding.current) {
      holding.current = false;
      onRelease?.();
    } else if (!cancelled) {
      onTap();
    }
  };

  return (
    <View
      style={[area, pressed && styles.halfPressed]}
      onTouchStart={start}
      onTouchEnd={() => end(false)}
      onTouchCancel={() => end(true)}
    >
      {children}
    </View>
  );
};

type PlayerCardProps = {
  index: number;
  players: number;
  isCross: boolean;
  style: StyleProp<ViewStyle>;
  life: number;
  pendingDelta: number;
  /** Commander damage this player has received, indexed by attacker. */
  damageTaken: number[];
  /** Damage this player has dealt to the current cmd receiver (0 outside cmd mode). */
  damageToReceiver: number;
  eliminated: boolean;
  /** Player currently entering commander damage they received, or null. */
  cmdFor: number | null;
  onLife: (delta: number) => void;
  onLifeHold: (delta: number) => void;
  onLifeHoldEnd: (delta: number) => void;
  onPing: () => void;
  onCmdDamage: (delta: number) => void;
  onCmdOpen: () => void;
  onCmdClose: () => void;
};

export const PlayerCard = ({
  index,
  players,
  isCross,
  style,
  life,
  pendingDelta,
  damageTaken,
  damageToReceiver,
  eliminated,
  cmdFor,
  onLife,
  onLifeHold,
  onLifeHoldEnd,
  onPing,
  onCmdDamage,
  onCmdOpen,
  onCmdClose,
}: PlayerCardProps) => {
  const rotation = getPlayerRotation(index, players, isCross);
  // Board-wide commander damage mode: cmdFor is the receiving player;
  // every other seat becomes the entry surface for that attacker's damage.
  const cmdMode = cmdFor !== null;
  const isReceiver = cmdFor === index;
  const isAttacker = cmdMode && !isReceiver;
  // In CMD mode the receiver reads and taps the attacker cards, so their
  // content and tap halves orient to the receiver's seat, not the card's.
  const displayRotation =
    cmdFor !== null && !isReceiver
      ? getPlayerRotation(cmdFor, players, isCross)
      : rotation;
  const sideways = displayRotation === "90deg" || displayRotation === "-90deg";
  const touch = TOUCH_AREAS[displayRotation];

  return (
    <View
      style={[
        styles.basePlayerContainer,
        style,
        {
          borderColor: isAttacker
            ? `${PLAYER_ACCENTS[cmdFor]}E6`
            : eliminated && !cmdMode
              ? "rgba(236, 230, 217, 0.12)"
              : `${PLAYER_ACCENTS[index]}B3`,
        },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.seatTint, { backgroundColor: `${PLAYER_ACCENTS[index]}4D` }]}
      />
      {!isReceiver && (
        <>
          <TouchHalf
            area={touch.dec}
            onTap={isAttacker ? () => onCmdDamage(-1) : () => onLife(-1)}
            onHold={isAttacker ? undefined : () => onLifeHold(-10)}
            onRelease={isAttacker ? undefined : () => onLifeHoldEnd(-10)}
          >
            <Text
              style={[styles.halfIndicator, { transform: [{ rotate: displayRotation }] }]}
            >
              -
            </Text>
          </TouchHalf>

          <TouchHalf
            area={touch.inc}
            onTap={isAttacker ? () => onCmdDamage(1) : () => onLife(1)}
            onHold={isAttacker ? undefined : () => onLifeHold(10)}
            onRelease={isAttacker ? undefined : () => onLifeHoldEnd(10)}
          >
            <Text
              style={[styles.halfIndicator, { transform: [{ rotate: displayRotation }] }]}
            >
              +
            </Text>
          </TouchHalf>
        </>
      )}

      <View
        pointerEvents="box-none"
        style={[
          styles.cardContent,
          { transform: [{ rotate: displayRotation }] },
          eliminated && !cmdMode && styles.eliminatedContent,
        ]}
      >
        {isAttacker ? (
          <View pointerEvents="none">
            <Text style={[styles.playerText, { color: PLAYER_ACCENTS[index] }]}>
              Player {index + 1}
            </Text>
            <View style={styles.counterContainer}>
              <Text
                style={[
                  styles.counterText,
                  sideways && styles.counterTextSideways,
                  { color: PLAYER_ACCENTS[cmdFor] },
                  damageToReceiver >= 21 && { color: "#FF6B5A" },
                ]}
              >
                {damageToReceiver}
              </Text>
            </View>
          </View>
        ) : isReceiver ? (
          <>
            <View pointerEvents="none" style={{ alignItems: "center" }}>
              <Text style={[styles.playerText, { color: PLAYER_ACCENTS[index] }]}>
                Player {index + 1}
              </Text>
              <Text
                style={[styles.counterText, sideways && styles.counterTextSideways]}
              >
                {life}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.commanderButton}
              onPress={onCmdClose}
              activeOpacity={0.7}
            >
              <Text style={styles.commanderButtonText}>DONE</Text>
            </TouchableOpacity>
          </>
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
                    !eliminated && life < 10 && { color: "#FF6B5A" },
                  ]}
                >
                  {life}
                </Text>
                {pendingDelta !== 0 && (
                  <Text
                    style={[
                      styles.deltaChip,
                      // Opposite side of the finger: minus is tapped on the
                      // player's left, plus on their right.
                      pendingDelta > 0 ? { left: -18 } : { right: -18 },
                      pendingDelta > 0
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
                    {pendingDelta > 0 ? `+${pendingDelta}` : pendingDelta}
                  </Text>
                )}
              </View>
            </View>
            {players > 1 && (
              <TouchableOpacity
                style={[
                  styles.commanderButton,
                  {
                    borderColor: PLAYER_ACCENTS[index],
                    backgroundColor: `${PLAYER_ACCENTS[index]}66`,
                  },
                ]}
                onPress={onCmdOpen}
                accessibilityLabel="Add commander damage received"
              >
                <MaterialCommunityIcons
                  name="sword-cross"
                  size={16}
                  color="#0C0F13"
                />
              </TouchableOpacity>
            )}
          </>
        )}
      </View>

      {!cmdMode && players > 1 && (
        <Pressable
          style={({ pressed }) => [
            styles.pingChip,
            CHIP_CORNERS[rotation],
            { transform: [{ rotate: rotation }] },
            eliminated && styles.eliminatedContent,
            pressed && styles.chipPressed,
          ]}
          onPress={onPing}
          accessibilityLabel="Each opponent loses 1 life"
        >
          <Text style={styles.pingChipText}>-1</Text>
          <Text style={styles.pingChipLabel}>ALL</Text>
        </Pressable>
      )}

      {!cmdMode &&
        damageTaken.some((dmg, from) => from < players && from !== index && dmg > 0) && (
          <View
            pointerEvents="none"
            style={[
              styles.cmdSummary,
              SUMMARY_CORNERS[rotation],
              { transform: [{ rotate: rotation }] },
              eliminated && styles.eliminatedContent,
            ]}
          >
            {damageTaken.map((dmg, from) =>
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
  );
};

const styles = StyleSheet.create({
  basePlayerContainer: {
    backgroundColor: "#1A212C",
    borderColor: "rgba(236, 230, 217, 0.2)",
    borderWidth: 1.5,
    borderRadius: 24,
    alignItems: "center",
    padding: 8,
    position: "relative",
  },
  seatTint: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
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
  halfIndicator: {
    fontSize: 44,
    fontWeight: "400",
    color: "rgba(236, 230, 217, 0.38)",
  },
  halfPressed: {
    backgroundColor: "rgba(236, 230, 217, 0.07)",
    borderRadius: 22,
  },
  cardContent: {
    zIndex: 3,
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
  deltaChip: {
    position: "absolute",
    top: 2,
    height: 26,
    fontSize: 15,
    fontWeight: "600",
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: "hidden",
    fontFamily: Platform.select({ ios: "Avenir Next", default: "sans-serif" }),
  },
  cmdSummary: {
    position: "absolute",
    alignItems: "center",
    gap: 3,
    zIndex: 3,
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
  pingChip: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: "rgba(236, 230, 217, 0.25)",
    backgroundColor: "rgba(236, 230, 217, 0.04)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 3,
  },
  pingChipText: {
    color: "#ECE6D9",
    fontSize: 15,
    lineHeight: 18,
    fontFamily: "Nunito_800ExtraBold",
  },
  pingChipLabel: {
    color: "rgba(236, 230, 217, 0.5)",
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "700",
  },
  chipPressed: {
    opacity: 0.55,
  },
  eliminatedContent: {
    opacity: 0.4,
  },
});

// Which card halves act as -/+ for a given content rotation, so the halves
// always read correctly from the seated player's point of view.
const TOUCH_AREAS: Record<Rotation, { dec: ViewStyle; inc: ViewStyle }> = {
  "0deg": { dec: styles.leftTouchArea, inc: styles.rightTouchArea },
  "90deg": { dec: styles.topTouchArea, inc: styles.bottomTouchArea },
  "-90deg": { dec: styles.bottomTouchArea, inc: styles.topTouchArea },
  "180deg": { dec: styles.rightTouchArea, inc: styles.leftTouchArea },
};

// The seat owner's bottom-right corner (ping chip), in screen coordinates.
const CHIP_CORNERS: Record<Rotation, ViewStyle> = {
  "0deg": { bottom: 12, right: 12 },
  "90deg": { bottom: 12, left: 12 },
  "-90deg": { top: 12, right: 12 },
  "180deg": { top: 12, left: 12 },
};

// The seat owner's bottom-left corner (damage summary), with extra inset
// on sideways seats so the rotated chip column stays inside the card.
const SUMMARY_CORNERS: Record<Rotation, ViewStyle> = {
  "0deg": { bottom: 14, left: 12 },
  "90deg": { top: 12, left: 26 },
  "-90deg": { bottom: 12, right: 26 },
  "180deg": { top: 14, right: 12 },
};
