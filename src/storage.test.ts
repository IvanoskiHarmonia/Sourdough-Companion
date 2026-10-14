import { createSession } from "./baking";
import { describe, expect, it, vi } from "vitest";
import {
  initialState,
  loadState,
  remainingTime,
  saveState,
  STORAGE_KEY,
  timerText,
  type SavedState,
  type Timer,
} from "./storage";
describe("persistent progress", () => {
  it("recovers cooking amount, lock, position and completion", () => {
    const session = {
      ...createSession(125),
      current: 4,
      completed: ["feed", "mix"],
    };
    const state: SavedState = {
      ...initialState,
      starter: "125",
      sessions: [session],
      activeSessionId: session.id,
    };
    expect(saveState(state)).toBe(true);
    expect(loadState()).toEqual(state);
  });
  it("recovers safely from corrupt or unsupported storage", () => {
    localStorage.setItem(STORAGE_KEY, "{broken");
    expect(loadState()).toEqual(initialState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 99 }));
    expect(loadState()).toEqual(initialState);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        sessions: [{ starter: -1 }],
        timers: [null, { id: "invalid" }],
      }),
    );
    expect(loadState().sessions).toEqual([]);
    expect(loadState().timers).toEqual([]);
  });
  it("reports a write failure instead of claiming to save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Quota");
    });
    expect(saveState(initialState)).toBe(false);
  });
});
describe("timestamp timers", () => {
  const timer: Timer = {
    id: "rest",
    label: "Initial rest",
    durationMs: 3600000,
    remainingMs: 3600000,
    endsAt: 4600000,
    status: "running",
  };
  it("persists the deadline and recovers elapsed time", () => {
    saveState({ ...initialState, timers: [timer] });
    expect(remainingTime(loadState().timers[0], 2800000)).toBe(1800000);
    expect(remainingTime(loadState().timers[0], 4600001)).toBe(0);
  });
  it("does not advance paused timers", () =>
    expect(
      remainingTime(
        { ...timer, status: "paused", endsAt: null, remainingMs: 60000 },
        99000000,
      ),
    ).toBe(60000));
  it("formats times including overnight and elapsed timers", () => {
    expect(timerText(36000000)).toBe("10:00:00");
    expect(timerText(1)).toBe("00:00:01");
    expect(timerText(-5)).toBe("00:00:00");
  });
});
