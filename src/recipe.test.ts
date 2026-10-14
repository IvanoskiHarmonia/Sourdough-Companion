import { describe, expect, it } from "vitest";
import {
  feedStarter,
  grams,
  loafPlan,
  parseAmount,
  recipeSteps,
  scaleRecipe,
} from "./recipe";

describe("recipe scaling", () => {
  it.each([
    [250, 725, 1000, 25],
    [150, 435, 600, 15],
    [125, 362.5, 500, 12.5],
    [500, 1450, 2000, 50],
  ])("scales %s g starter", (starter, water, flour, salt) => {
    expect(scaleRecipe(starter)).toMatchObject({
      starter,
      water,
      flour,
      salt,
      total: starter + water + flour + salt,
    });
  });
  it("keeps fractional precision in the calculation", () => {
    expect(scaleRecipe(13.12345).water).toBe(725 * (13.12345 / 250));
    expect(grams(100 / 3)).toBe("≈ 33.333 g");
  });
  it.each([
    "",
    "-10",
    "0",
    "banana",
    "Infinity",
    "NaN",
    "1e3",
    "1.2.3",
    "100001",
    "1,000,000",
  ])("rejects invalid input %s", (value) =>
    expect(parseAmount(value)).toBeNull(),
  );
  it("accepts decimal keyboard formats", () => {
    expect(parseAmount("125,5")).toBe(125.5);
    expect(parseAmount(".5")).toBe(0.5);
    expect(parseAmount(" 2.25 ")).toBe(2.25);
  });
  it.each([0, -1, Infinity, NaN, 100001])(
    "rejects invalid calculation values %s",
    (value) => {
      expect(() => scaleRecipe(value)).toThrow();
      expect(() => feedStarter(value, "target")).toThrow();
    },
  );
  it("suggests sensible loaf sizes", () => {
    expect(loafPlan(2000)).toEqual({ count: 2, weight: 1000 });
    expect(loafPlan(1200)).toEqual({ count: 1, weight: 1200 });
    expect(loafPlan(4000)).toEqual({ count: 4, weight: 1000 });
  });
});
describe("feeding and instructions", () => {
  it("feeds existing starter equally", () =>
    expect(feedStarter(50, "existing")).toEqual({
      existing: 50,
      water: 50,
      flour: 50,
      total: 150,
    }));
  it("calculates a target without rounding thirds", () =>
    expect(feedStarter(100, "target")).toEqual({
      existing: 100 / 3,
      water: 100 / 3,
      flour: 100 / 3,
      total: 100,
    }));
  it("updates ingredient and loaf instructions together", () => {
    const steps = recipeSteps(125);
    expect(steps.find((s) => s.id === "mix")?.text).toContain(
      "125 g active starter with 362.5 g warm water",
    );
    expect(steps.find((s) => s.id === "flour")?.text).toContain(
      "500 g bread flour",
    );
    expect(steps.find((s) => s.id === "salt")?.text).toContain("12.5 g salt");
    expect(steps.find((s) => s.id === "shape")?.text).toContain(
      "one loaf of 1,000 g",
    );
    expect(steps.filter((s) => s.id.startsWith("fold-"))).toHaveLength(4);
    expect(
      steps.filter((s) => s.id.startsWith("fold-") && s.minutes),
    ).toHaveLength(3);
  });
});
