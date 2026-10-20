import { MAX_STARTER, parseAmount, recipeSteps } from "./recipe";
import { type Session, type LegacyLoaf } from "./baking";
export type { Session } from "./baking";
// Keep the same storage key so both previous versions can be migrated in place.
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
export type SavedState = {
  version: 2;
  starter: string;
  feedAmount: string;
  feedMode: "existing" | "target";
  sessions: Session[];
  activeSessionId: string | null;
  timers: Timer[];
};
export const initialState: SavedState = {
  version: 2,
  starter: "50",
  feedAmount: "50",
  feedMode: "existing",
  sessions: [],
  activeSessionId: null,
  timers: [],
};
const ids = recipeSteps(250).map((s) => s.id);
const completedIds = (value: unknown): string[] =>
  Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is string => typeof id === "string" && ids.includes(id),
          ),
        ),
      ]
    : [];
const validPosition = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= 0 &&
  value < ids.length;
function readSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const s = value as Session;
  if (
    typeof s.id !== "string" ||
    !/^[a-zA-Z0-9-]+$/.test(s.id) ||
    typeof s.name !== "string" ||
    !s.name.trim() ||
    !Number.isFinite(s.starter) ||
    s.starter <= 0 ||
    s.starter > MAX_STARTER ||
    !validPosition(s.current) ||
    !Array.isArray(s.completed)
  )
    return null;
  const legacyLoaves = Array.isArray(s.legacyLoaves)
    ? s.legacyLoaves
        .slice(0, 24)
        .map(
          (l): LegacyLoaf => ({
            current: validPosition(l?.current) ? l.current : 11,
            completed: completedIds(l?.completed),
          }),
        )
    : undefined;
  return {
    id: s.id,
    name: s.name.trim().slice(0, 60),
    starter: s.starter,
    current: s.current,
    completed: completedIds(s.completed),
    locked: s.locked !== false,
    ...(legacyLoaves?.length ? { legacyLoaves } : {}),
  };
}
export function activeSession(state: SavedState) {
  return state.sessions.find((s) => s.id === state.activeSessionId) ?? null;
}
export function updateActive(
  state: SavedState,
  update: (session: Session) => Session,
): SavedState {
  return {
    ...state,
    sessions: state.sessions.map((s) =>
      s.id === state.activeSessionId ? update(s) : s,
    ),
  };
}
export function removeActive(state: SavedState): SavedState {
  const current = activeSession(state);
  const sessions = state.sessions.filter((s) => s.id !== state.activeSessionId);
  return {
    ...state,
    sessions,
    activeSessionId: sessions[0]?.id ?? null,
    starter: String(sessions[0]?.starter ?? current?.starter ?? state.starter),
    timers: state.timers.filter(
      (t) => !t.id.startsWith(`${state.activeSessionId}::`),
    ),
  };
}
export function loadState(): SavedState {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!s || ![1, 2].includes(s.version)) return initialState;
    let sessions: Session[] = [];
    let migratedId: string | null = null;
    if (s.version === 2 && Array.isArray(s.sessions)) {
      sessions = s.sessions
        .map(readSession)
        .filter((v: Session | null): v is Session => !!v)
        .filter(
          (v: Session, i: number, a: Session[]) =>
            a.findIndex((x) => x.id === v.id) === i,
        );
    } else if (s.version === 1 && s.session) {
      const old = s.session;
      const legacyLoaves: LegacyLoaf[] | undefined =
        Array.isArray(old.loaves) && old.loaves.length
          ? old.loaves
              .slice(0, 24)
              .map((l: LegacyLoaf | null) => ({
                current: validPosition(l?.current) ? l!.current : 11,
                completed: completedIds(l?.completed),
              }))
          : undefined;
      const selectedLoaf =
        legacyLoaves && Number.isInteger(old.activeLoaf)
          ? legacyLoaves[old.activeLoaf]
          : undefined;
      // A batch step is complete only if every old loaf completed it. The original
      // per-loaf records remain visible; no checkmarks or deadlines are discarded.
      const sharedCompletion = completedIds(old.completed);
      const commonCompletion = legacyLoaves
        ? ids.filter((id) =>
            legacyLoaves.every((l) => l.completed.includes(id)),
          )
        : [];
      const restored = readSession({
        ...old,
        id: "restored-bake",
        name: "Bake 1",
        current: selectedLoaf?.current ?? old.current,
        completed: [...new Set([...sharedCompletion, ...commonCompletion])],
        ...(legacyLoaves ? { legacyLoaves } : {}),
      });
      if (restored) {
        sessions = [restored];
        migratedId = restored.id;
      }
    }
    const validTimerId = (id: string): boolean => {
      const parts = id.split("::");
      if (parts.length === 1) return ids.includes(id);
      if (parts.length !== 2) return false;
      const owner = sessions.find((session) => session.id === parts[0]);
      if (!owner) return false;
      if (ids.includes(parts[1])) return true;
      const loaf = /^loaf-(\d+):(.+)$/.exec(parts[1]);
      return (
        !!loaf &&
        !!owner.legacyLoaves &&
        Number(loaf[1]) >= 1 &&
        Number(loaf[1]) <= owner.legacyLoaves.length &&
        ids.includes(loaf[2])
      );
    };
    const timers: Timer[] = Array.isArray(s.timers)
      ? s.timers
          .filter(
            (t: Timer) =>
              t &&
              typeof t.id === "string" &&
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
          .map((t: Timer) => ({
            ...t,
            ...(migratedId
              ? { id: `${migratedId}::${t.id}`, label: `Bake 1 · ${t.label}` }
              : {}),
            notified: t.notified === true,
          }))
          .filter((t: Timer) => validTimerId(t.id))
          .filter(
            (t: Timer, i: number, a: Timer[]) =>
              a.findIndex((x) => x.id === t.id) === i,
          )
      : [];
    return {
      version: 2,
      starter:
        typeof s.starter === "string" && parseAmount(s.starter) !== null
          ? s.starter
          : initialState.starter,
      feedAmount:
        typeof s.feedAmount === "string" && parseAmount(s.feedAmount) !== null
          ? s.feedAmount
          : "50",
      feedMode: s.feedMode === "target" ? "target" : "existing",
      sessions,
      activeSessionId: sessions.some(
        (session) => session.id === s.activeSessionId,
      )
        ? s.activeSessionId
        : (sessions[0]?.id ?? null),
      timers,
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
