import { MAX_STARTER, parseAmount, recipeSteps } from "./recipe";
export const STORAGE_KEY = "sourdough-companion-v1";
export type Timer = {
  id: string;
  label: string;
  durationMs: number;
  endsAt: number | null;
  remainingMs: number;
  status: "running" | "paused" | "done";
  notified?: boolean;
};
export type Session = {
  starter: number;
  current: number;
  completed: string[];
  locked: boolean;
};
export type SavedState = {
  version: 1;
  starter: string;
  feedAmount: string;
  feedMode: "existing" | "target";
  session: Session | null;
  timers: Timer[];
};
export const initialState: SavedState = {
  version: 1,
  starter: "250",
  feedAmount: "50",
  feedMode: "existing",
  session: null,
  timers: [],
};
const ids = recipeSteps(250).map((s) => s.id);
export function loadState(): SavedState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!s || s.version !== 1) return initialState;
    const session = s.session;
    return {
      version: 1,
      starter:
        typeof s.starter === "string" && parseAmount(s.starter) !== null
          ? s.starter
          : "250",
      feedAmount:
        typeof s.feedAmount === "string" && parseAmount(s.feedAmount) !== null
          ? s.feedAmount
          : "50",
      feedMode: s.feedMode === "target" ? "target" : "existing",
      session:
        session &&
        Number.isFinite(session.starter) &&
        session.starter > 0 &&
        session.starter <= MAX_STARTER &&
        Number.isInteger(session.current) &&
        session.current >= 0 &&
        session.current < ids.length &&
        Array.isArray(session.completed)
          ? {
              starter: session.starter,
              current: session.current,
              completed: [
                ...new Set<string>(
                  session.completed.filter(
                    (id: unknown) => typeof id === "string" && ids.includes(id),
                  ),
                ),
              ],
              locked: session.locked !== false,
            }
          : null,
      timers: Array.isArray(s.timers)
        ? s.timers
            .filter(
              (t: Timer) =>
                t &&
                typeof t.id === "string" &&
                ids.includes(t.id) &&
                typeof t.label === "string" &&
                Number.isFinite(t.durationMs) &&
                t.durationMs > 0 &&
                t.durationMs <= 48 * 3600000 &&
                Number.isFinite(t.remainingMs) &&
                t.remainingMs >= 0 &&
                t.remainingMs <= t.durationMs &&
                ["running", "paused", "done"].includes(t.status) &&
                (t.status !== "running" ||
                  (Number.isFinite(t.endsAt) && t.endsAt! > 0)),
            )
            .filter(
              (t: Timer, i: number, a: Timer[]) =>
                a.findIndex((x) => x.id === t.id) === i,
            )
            .map((t: Timer) => ({ ...t, notified: t.notified === true }))
        : [],
    };
  } catch {
    return initialState;
  }
}
export function saveState(state: SavedState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
export function remainingTime(timer: Timer, now = Date.now()) {
  return timer.status === "done"
    ? 0
    : timer.status === "running"
      ? Math.max(0, (timer.endsAt ?? now) - now)
      : timer.remainingMs;
}
export function timerText(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((v) => String(v).padStart(2, "0"))
    .join(":");
}
