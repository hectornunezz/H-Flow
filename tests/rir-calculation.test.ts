import {
  calculateAverageRirDifference,
  calculateRirDifference,
} from "../hflow-frontend/src/lib/rir-calculation";

describe("RIR calculation", () => {
  it("calculates positive, negative, and on-target differences to one decimal", () => {
    expect(calculateRirDifference(2, 3)).toBe(1);
    expect(calculateRirDifference(3, 1.5)).toBe(-1.5);
    expect(calculateRirDifference(2, 2)).toBe(0);
    expect(calculateRirDifference(2, 2.26)).toBe(0.3);
  });

  it("keeps a missing actual RIR pending", () => {
    expect(calculateRirDifference(2, null)).toBeNull();
  });

  it("averages only completed sets and rounds the result to one decimal", () => {
    expect(
      calculateAverageRirDifference([
        { targetRir: 2, actualRir: 3 },
        { targetRir: 3, actualRir: 2 },
        { targetRir: 2, actualRir: null },
      ]),
    ).toBe(0);
    expect(
      calculateAverageRirDifference([
        { targetRir: 1.5, actualRir: 2 },
        { targetRir: 2, actualRir: 2.5 },
      ]),
    ).toBe(0.5);
    expect(
      calculateAverageRirDifference([
        { targetRir: 1, actualRir: 1.04 },
        { targetRir: 1, actualRir: 1.04 },
        { targetRir: 1, actualRir: 1.14 },
      ]),
    ).toBe(0.1);
  });

  it("returns no average when no set has an actual RIR", () => {
    expect(
      calculateAverageRirDifference([
        { targetRir: 2, actualRir: null },
        { targetRir: 3, actualRir: null },
      ]),
    ).toBeNull();
    expect(calculateAverageRirDifference([])).toBeNull();
  });
});
