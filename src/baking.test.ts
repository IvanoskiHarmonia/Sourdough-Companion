import { expect, it, describe } from "vitest";
import {
  createSession,
  navigateStep,
  scopedStep,
  bakeProgress,
} from "./baking";
import {
  initialState,
  loadState,
  saveState,
  STORAGE_KEY,
  updateActive,
  removeActive,
  type SavedState,
} from "./storage";
import { recipeSteps } from "./recipe";

describe("independent baking sessions", () => {
  it("starts 50 g and 100 g bakes independently at the first step", () => {
    const a = createSession(50, "Small bake"),
      b = createSession(100, "Large bake");
    expect(a.id).not.toBe(b.id);
    expect(a.current).toBe(0);
    expect(b.current).toBe(0);
    expect(recipeSteps(a.starter)[1].text).toContain("145 g warm water");
    expect(recipeSteps(b.starter)[1].text).toContain("290 g warm water");
  });
  it("updates only the selected bake and persists both recipes and progress", () => {
    const a = createSession(50),
      b = createSession(100, "Bake 2");
    let state: SavedState = {
      ...initialState,
      sessions: [a, b],
      activeSessionId: a.id,
    };
    state = updateActive(state, (s) => ({
      ...navigateStep(s, 1),
      completed: ["feed"],
      locked: false,
    }));
    state = { ...state, activeSessionId: b.id };
    state = updateActive(state, (s) => ({
      ...s,
      current: 4,
      completed: ["feed", "mix", "flour", "salt"],
    }));
    saveState(state);
    expect(loadState()).toEqual(state);
    expect(state.sessions[0]).toMatchObject({
      starter: 50,
      current: 1,
      completed: ["feed"],
      locked: false,
    });
    expect(state.sessions[1]).toMatchObject({
      starter: 100,
      current: 4,
      locked: true,
    });
    expect(bakeProgress(state.sessions[0])).toEqual({
      completed: 1,
      total: 17,
    });
  });
  it("keeps identical timer types separate even with identical bake names", () => {
    const a = createSession(50, "Bread"),
      b = createSession(100, "Bread");
    const steps = [
      scopedStep(recipeSteps(50)[4], a),
      scopedStep(recipeSteps(100)[4], b),
    ];
    expect(steps[0].id).not.toBe(steps[1].id);
    const timers = steps.map((s) => ({
      id: s.id,
      label: s.timerLabel!,
      durationMs: 3600000,
      remainingMs: 3600000,
      endsAt: 9000000,
      status: "running" as const,
      notified: false,
    }));
    const state: SavedState = {
      ...initialState,
      sessions: [a, b],
      activeSessionId: b.id,
      timers,
    };
    saveState(state);
    expect(loadState().timers).toEqual(timers);
    const removed = removeActive(state);
    expect(removed.sessions).toEqual([a]);
    expect(removed.activeSessionId).toBe(a.id);
    expect(removed.timers).toEqual([timers[0]]);
  });
  it("migrates the original single-bake format without losing progress or time", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        version: 1,
        session: {
          starter: 50,
          current: 4,
          completed: ["feed", "mix"],
          locked: true,
        },
        timers: [
          {
            id: "rest",
            label: "Initial rest",
            durationMs: 3600000,
            remainingMs: 3600000,
            endsAt: 9000000,
            status: "running",
          },
        ],
      }),
    );
    const state = loadState();
    expect(state.version).toBe(2);
    expect(state.sessions).toHaveLength(1);
    expect(state.sessions[0]).toMatchObject({
      starter: 50,
      current: 4,
      completed: ["feed", "mix"],
    });
    expect(state.timers[0]).toMatchObject({
      id: "restored-bake::rest",
      endsAt: 9000000,
    });
  });
  it("preserves previous multi-loaf records and every timer on migration", () => {
    const loaves = [
      { current: 14, completed: ["proof", "preheat"] },
      { current: 11, completed: ["proof"] },
    ];
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        version: 1,
        session: {
          starter: 250,
          current: 10,
          completed: ["feed", "shape"],
          locked: true,
          activeLoaf: 0,
          loaves,
        },
        timers: [
          {
            id: "loaf-1:covered",
            label: "Loaf 1 · Covered bake",
            durationMs: 2100000,
            remainingMs: 2100000,
            endsAt: 9000000,
            status: "running",
          },
          {
            id: "loaf-2:proof",
            label: "Loaf 2 · Overnight proof",
            durationMs: 36000000,
            remainingMs: 36000000,
            endsAt: 42000000,
            status: "running",
          },
        ],
      }),
    );
    const state = loadState();
    expect(state.sessions[0]).toMatchObject({
      current: 14,
      completed: ["feed", "shape", "proof"],
      legacyLoaves: loaves,
    });
    expect(state.timers.map((t) => t.endsAt)).toEqual([9000000, 42000000]);
    saveState(state);
    expect(loadState()).toEqual(state);
  });
  it("rejects orphan timers and recovers a stale selected bake", () => {
    const session = createSession(50);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...initialState,
        sessions: [null, session],
        activeSessionId: "missing",
        timers: [
          {
            id: "missing::rest",
            label: "Orphan",
            durationMs: 1000,
            remainingMs: 1000,
            endsAt: 10000,
            status: "running",
          },
        ],
      }),
    );
    expect(loadState().activeSessionId).toBe(session.id);
    expect(loadState().timers).toEqual([]);
  });
});
