import { describe, expect, it } from "vitest";
import {
  buildSchedule,
  loadSchedule,
  localDateTime,
  parseLocalDateTime,
  scheduleDefaults,
  SCHEDULE_KEY,
} from "./schedule";
const at = (value: string) => new Date(value).getTime();
const input = { ...scheduleDefaults, fedAt: "2026-11-13T08:00" };
describe("feeding-to-fridge schedule", () => {
  it("includes activation, mixing, rest, four rounds, three waits, bulk and shaping", () => {
    const plan = buildSchedule(input)!;
    expect(plan.lastFoldAt).toBe(at("2026-11-13T15:05"));
    expect(plan.fridgeAt).toBe(at("2026-11-13T19:20"));
    const folds = plan.milestones.filter((s) => s.id.startsWith("fold-"));
    expect(folds.map((s) => s.at)).toEqual(
      ["13:15", "13:50", "14:25", "15:00"].map((t) => at(`2026-11-13T${t}`)),
    );
    expect(folds.at(-1)!.end).toBe(plan.lastFoldAt);
  });
  it("does not insert a fourth waiting interval after the last fold", () => {
    const plan = buildSchedule({
      ...input,
      mixingMinutes: "0",
      foldMinutes: "0",
      shapingMinutes: "0",
    })!;
    expect(plan.lastFoldAt).toBe(at("2026-11-13T14:30"));
    expect(plan.fridgeAt).toBe(at("2026-11-13T18:30"));
  });
  it("handles midnight and month/year rollover", () => {
    const plan = buildSchedule({ ...input, fedAt: "2026-12-31T18:00" })!;
    expect(plan.lastFoldAt).toBe(at("2027-01-01T01:05"));
    expect(plan.fridgeAt).toBe(at("2027-01-01T05:20"));
  });
  it("supports already-active starter and fractional timing estimates", () => {
    const plan = buildSchedule({
      ...input,
      activationHours: "0",
      bulkHours: "2.5",
    })!;
    expect(plan.lastFoldAt).toBe(at("2026-11-13T11:05"));
    expect(plan.fridgeAt).toBe(at("2026-11-13T13:50"));
  });
  it.each(["", "not a date", "2026-02-30T08:00", "2026-11-13T25:00"])(
    "rejects invalid feeding date %s",
    (fedAt) => expect(buildSchedule({ ...input, fedAt })).toBeNull(),
  );
  it.each(["", "-1", "49", "Infinity", "abc"])(
    "rejects invalid activation duration %s",
    (activationHours) =>
      expect(buildSchedule({ ...input, activationHours })).toBeNull(),
  );
  it("validates hands-on limits", () => {
    expect(buildSchedule({ ...input, foldMinutes: "31" })).toBeNull();
    expect(buildSchedule({ ...input, mixingMinutes: "121" })).toBeNull();
    expect(buildSchedule({ ...input, shapingMinutes: "-1" })).toBeNull();
  });
  it("round-trips local dates without a UTC conversion", () => {
    const date = new Date(2026, 10, 13, 8, 15);
    expect(localDateTime(date)).toBe("2026-11-13T08:15");
    expect(parseLocalDateTime(localDateTime(date))).toBe(date.getTime());
  });
  it("restores a saved plan and recovers safely from corrupt storage", () => {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(input));
    expect(loadSchedule()).toEqual(input);
    localStorage.setItem(SCHEDULE_KEY, "{broken");
    expect(buildSchedule(loadSchedule())).not.toBeNull();
    localStorage.setItem(
      SCHEDULE_KEY,
      JSON.stringify({ ...input, bulkHours: "-1" }),
    );
    expect(loadSchedule().bulkHours).toBe(scheduleDefaults.bulkHours);
  });
});
