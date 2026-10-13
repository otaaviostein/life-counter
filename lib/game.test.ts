import { CROSS_SLOTS, getPlayerRotation } from "./game";

describe("getPlayerRotation", () => {
  it("keeps grid seats facing each other per player count", () => {
    expect(getPlayerRotation(0, 1, false)).toBe("0deg");
    expect(getPlayerRotation(0, 2, false)).toBe("180deg");
    expect(getPlayerRotation(1, 2, false)).toBe("0deg");
    expect(getPlayerRotation(2, 3, false)).toBe("0deg");
    expect(getPlayerRotation(2, 4, false)).toBe("90deg");
    expect(getPlayerRotation(4, 5, false)).toBe("0deg");
    expect(getPlayerRotation(4, 6, false)).toBe("90deg");
    expect(getPlayerRotation(5, 6, false)).toBe("-90deg");
  });

  it("orients cross seats toward the table center", () => {
    expect(getPlayerRotation(0, 2, true)).toBe("180deg"); // top
    expect(getPlayerRotation(1, 2, true)).toBe("0deg"); // bottom
    expect(getPlayerRotation(1, 4, true)).toBe("90deg"); // left
    expect(getPlayerRotation(2, 4, true)).toBe("-90deg"); // right
  });

  it("defines cross slots for every count that can pick the cross layout", () => {
    [1, 2, 3, 4].forEach((count) => {
      expect(CROSS_SLOTS[count]).toHaveLength(count);
    });
  });
});
