import { recipeSteps, scaleRecipe, type Step } from "./recipe";

export type LegacyLoaf = { current: number; completed: string[] };
export type Session = {
  id: string;
  name: string;
  starter: number;
  current: number;
  completed: string[];
  locked: boolean;
  legacyLoaves?: LegacyLoaf[];
};
export function createSession(starter: number, name = "Bake 1"): Session {
  scaleRecipe(starter);
  return {
    id: crypto.randomUUID(),
    name: name.trim().slice(0, 60) || "My bake",
    starter,
    current: 0,
    completed: [],
    locked: true,
  };
}
export function scopedStep(step: Step, session: Session): Step {
  return {
    ...step,
    id: `${session.id}::${step.id}`,
    timerLabel: step.timerLabel
      ? `${session.name} · ${step.timerLabel}`
      : undefined,
  };
}
export function timerSteps(steps: Step[], session: Session | null): Step[] {
  return session ? steps.map((step) => scopedStep(step, session)) : steps;
}
export function bakeProgress(session: Session) {
  return {
    completed: session.completed.length,
    total: recipeSteps(session.starter).length,
  };
}
export function navigateStep(session: Session, direction: -1 | 1): Session {
  return {
    ...session,
    current: Math.max(
      0,
      Math.min(
        recipeSteps(session.starter).length - 1,
        session.current + direction,
      ),
    ),
  };
}
