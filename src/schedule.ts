import { recipeSteps } from "./recipe";

const steps = recipeSteps(50);
const duration = (id: string) => steps.find((step) => step.id === id)!.minutes!;
const folds = steps.filter((step) => step.id.startsWith("fold-"));
export const scheduleDefaults = {
  activationHours: String(duration("feed") / 60),
  mixingMinutes: "15",
  foldMinutes: "5",
  bulkHours: String(duration("bulk") / 60),
  shapingMinutes: "15",
};
export type ScheduleInputs = typeof scheduleDefaults & { fedAt: string };
export const SCHEDULE_KEY = "sourdough-schedule-v1";
export function localDateTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function parseLocalDateTime(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  // Reject impossible calendar dates and skipped local times at a DST change.
  return Number.isFinite(date.getTime()) && localDateTime(date) === value
    ? date.getTime()
    : null;
}
export type Milestone = {
  id: string;
  label: string;
  at: number;
  end?: number;
  detail: string;
};
export function buildSchedule(input: ScheduleInputs) {
  const fedAt = parseLocalDateTime(input.fedAt);
  const limits = {
    activationHours: 48,
    mixingMinutes: 120,
    foldMinutes: 30,
    bulkHours: 48,
    shapingMinutes: 120,
  };
  for (const key of Object.keys(limits) as (keyof typeof limits)[]) {
    const raw = input[key];
    if (
      typeof raw !== "string" ||
      raw.trim() === "" ||
      !Number.isFinite(Number(raw)) ||
      Number(raw) < 0 ||
      Number(raw) > limits[key]
    )
      return null;
  }
  if (fedAt === null) return null;
  const addMinutes = (time: number, minutes: number) => time + minutes * 60_000;
  const activeAt = addMinutes(fedAt, Number(input.activationHours) * 60);
  const mixedAt = addMinutes(activeAt, Number(input.mixingMinutes));
  let cursor = addMinutes(mixedAt, duration("rest"));
  const milestones: Milestone[] = [
    {
      id: "feed",
      label: "Feed your starter",
      at: fedAt,
      detail: "The beginning of your plan.",
    },
    {
      id: "mix",
      label: "Starter ready · mix the dough",
      at: activeAt,
      end: mixedAt,
      detail: "Look for bubbles and a significant rise before mixing.",
    },
    {
      id: "rest",
      label: "Cover and rest",
      at: mixedAt,
      end: cursor,
      detail: `${duration("rest")} minutes of rest.`,
    },
  ];
  for (const [index, fold] of folds.entries()) {
    const end = addMinutes(cursor, Number(input.foldMinutes));
    milestones.push({
      id: fold.id,
      label: `Stretch & fold ${index + 1} of ${folds.length}`,
      at: cursor,
      end,
      detail:
        index < folds.length - 1
          ? `Four gentle folds, then wait ${fold.minutes} minutes.`
          : "Your last round. Cover for bulk fermentation next.",
    });
    cursor = addMinutes(end, fold.minutes ?? 0);
  }
  const lastFoldAt = cursor;
  const shapeAt = addMinutes(lastFoldAt, Number(input.bulkHours) * 60);
  const fridgeAt = addMinutes(shapeAt, Number(input.shapingMinutes));
  milestones.push(
    {
      id: "bulk",
      label: "Bulk fermentation",
      at: lastFoldAt,
      end: shapeAt,
      detail: "Wait until the dough is airy, visibly risen, and jiggly.",
    },
    {
      id: "shape",
      label: "Divide and shape",
      at: shapeAt,
      end: fridgeAt,
      detail: "Shape and place in your prepared proofing baskets.",
    },
    {
      id: "fridge",
      label: "Into the fridge",
      at: fridgeAt,
      detail: "Cover and refrigerate overnight, approximately 8–12 hours.",
    },
  );
  return { fedAt, lastFoldAt, fridgeAt, milestones };
}
export function loadSchedule(): ScheduleInputs {
  const defaults = { ...scheduleDefaults, fedAt: localDateTime() };
  try {
    const stored = JSON.parse(localStorage.getItem(SCHEDULE_KEY) || "null");
    if (stored && buildSchedule(stored)) return { ...defaults, ...stored };
  } catch {
    /* An invalid saved plan should not prevent opening the calculator. */
  }
  return defaults;
}
