export type Rotation = "0deg" | "90deg" | "-90deg" | "180deg";
export type LayoutMode = "table" | "cross";

export type GameConfig = {
  players: number;
  startingLife: number;
  layoutMode: LayoutMode;
};

export const PLAYER_ACCENTS = [
  "#EDE4C8", // pastel ivory
  "#9BC8EE", // pastel sky
  "#C5B3E6", // pastel lavender
  "#F0998D", // pastel salmon
  "#9FD8B4", // pastel mint
  "#EBA8CD", // pastel pink
];

export type CrossSlot = "top" | "left" | "right" | "bottom";

export const CROSS_SLOTS: Record<number, CrossSlot[]> = {
  1: ["bottom"],
  2: ["top", "bottom"],
  3: ["top", "left", "right"],
  4: ["top", "left", "right", "bottom"],
};

export const CROSS_ROTATIONS: Record<CrossSlot, Rotation> = {
  top: "180deg",
  left: "90deg",
  right: "-90deg",
  bottom: "0deg",
};

// Row structure of the grid board per player count; every card flexes evenly.
export const BOARD_ROWS: Record<number, number[][]> = {
  1: [[0]],
  2: [[0], [1]],
  3: [[0, 1], [2]],
  4: [[0, 1], [2, 3]],
  5: [[0, 1], [2, 3], [4]],
  6: [[0, 1], [2, 3], [4, 5]],
};

export const getPlayerRotation = (
  index: number,
  players: number,
  isCross: boolean
): Rotation => {
  if (isCross) return CROSS_ROTATIONS[CROSS_SLOTS[players][index]];
  const rotations: Record<number, Rotation> = {
    0: players === 2 ? "180deg" : players === 1 ? "0deg" : "90deg",
    1: players === 2 ? "0deg" : "-90deg",
    2: players === 3 ? "0deg" : "90deg",
    3: "-90deg",
    4: players === 5 ? "0deg" : "90deg",
    5: "-90deg",
  };
  return rotations[index] ?? "0deg";
};
