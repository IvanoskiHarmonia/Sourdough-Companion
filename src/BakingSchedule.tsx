import { useEffect, useState } from "react";
import { Icon } from "./Icons";
import {
  buildSchedule,
  loadSchedule,
  localDateTime,
  SCHEDULE_KEY,
  type ScheduleInputs,
} from "./schedule";
const adjustments: {
  key: Exclude<keyof ScheduleInputs, "fedAt">;
  label: string;
  max: number;
  unit: string;
}[] = [
  {
    key: "activationHours",
    label: "Starter activation",
    max: 48,
    unit: "hours",
  },
  {
    key: "bulkHours",
    label: "Bulk fermentation after folds",
    max: 48,
    unit: "hours",
  },
  {
    key: "mixingMinutes",
    label: "Mixing the dough",
    max: 120,
    unit: "minutes",
  },
  {
    key: "foldMinutes",
    label: "Each stretch-and-fold round",
    max: 30,
    unit: "minutes",
  },
  {
    key: "shapingMinutes",
    label: "Dividing and shaping",
    max: 120,
    unit: "minutes",
  },
];
const time = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const date = (at: number) =>
  new Date(at).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
export default function Schedule() {
  const [input, setInput] = useState(loadSchedule);
  const [saveError, setSaveError] = useState(false);
  const plan = buildSchedule(input);
  useEffect(() => {
    if (!buildSchedule(input)) return;
    try {
      localStorage.setItem(SCHEDULE_KEY, JSON.stringify(input));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [input]);
  const set = (key: keyof ScheduleInputs, value: string) =>
    setInput((s) => ({ ...s, [key]: value }));
  return (
    <>
      <header className="page-header">
        <span className="eyebrow">A LITTLE PLANNING, A CALMER EVENING</span>
        <h1>When will my dough be ready?</h1>
        <p>
          Start with feeding time. See when you’ll finish folding and tuck your
          dough in for the night.
        </p>
      </header>
      <section
        className="card schedule-inputs"
        aria-label="Baking schedule inputs"
      >
        <label className="schedule-start" htmlFor="fed-at">
          When will you feed your starter?
          <input
            id="fed-at"
            type="datetime-local"
            value={input.fedAt}
            onChange={(e) => set("fedAt", e.target.value)}
            aria-describedby="schedule-local-time"
          />
        </label>
        <button
          className="secondary"
          onClick={() => set("fedAt", localDateTime())}
        >
          Use current time
        </button>
        <p id="schedule-local-time" className="muted small">
          Times use this device’s local time zone. Pick a date as well as a time
          to plan across midnight.
        </p>
        <details className="schedule-adjustments">
          <summary>Adjust timing estimates</summary>
          <p>
            Use your starter’s usual rise time and the time you expect to spend
            working with the dough. Enter 0 hours for activation if it’s already
            active.
          </p>
          <div className="schedule-fields">
            {adjustments.map((field) => (
              <label key={field.key}>
                {field.label}
                <div>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    max={field.max}
                    step="any"
                    value={input[field.key]}
                    aria-label={`${field.label} (${field.unit})`}
                    onChange={(e) => set(field.key, e.target.value)}
                  />
                  <span>{field.unit}</span>
                </div>
                <small>
                  0–{field.max} {field.unit}
                </small>
              </label>
            ))}
          </div>
          <p>
            The recipe’s initial rest is 1 hour, with 30 minutes between each of
            the four fold rounds. Hands-on time is included in this plan.
          </p>
        </details>
      </section>
      {saveError && (
        <p role="alert" className="error">
          Your plan could not be saved on this device. The calculator still
          works while this page is open.
        </p>
      )}
      {!plan ? (
        <p className="banner error" role="alert">
          Enter a valid feeding date and time, and a number within each timing
          range.
        </p>
      ) : (
        <>
          <div
            className="schedule-results"
            aria-live="polite"
            aria-atomic="true"
          >
            <section
              className="card schedule-result"
              aria-label="Last fold estimate"
            >
              <span className="eyebrow">LAST STRETCH & FOLD FINISHED</span>
              <strong>{time(plan.lastFoldAt)}</strong>
              <span>{date(plan.lastFoldAt)}</span>
              <p>
                About{" "}
                {((plan.lastFoldAt - plan.fedAt) / 3600000).toLocaleString([], {
                  maximumFractionDigits: 2,
                })}{" "}
                hours after feeding.
              </p>
            </section>
            <section
              className="card schedule-result"
              aria-label="Refrigeration estimate"
            >
              <span className="eyebrow">READY TO CHILL OVERNIGHT</span>
              <strong>{time(plan.fridgeAt)}</strong>
              <span>{date(plan.fridgeAt)}</span>
              <p>Includes bulk fermentation after the folds, then shaping.</p>
            </section>
          </div>
          <div className="callout">
            <Icon name="leaf" />
            <p>
              <strong>A guide for your day, not a deadline.</strong>The last
              fold isn’t fridge time yet. This recipe calls for bulk
              fermentation and shaping afterward. Temperature and starter
              strength change the timing; follow your dough’s readiness. This
              plan doesn’t start timers or change any of your bakes.
            </p>
          </div>
          <section
            className="card schedule-timeline"
            aria-label="Estimated baking timeline"
          >
            <h2>Your day, step by step</h2>
            <ol>
              {plan.milestones.map((milestone) => (
                <li key={milestone.id}>
                  <div className="schedule-when">
                    <strong>
                      {time(milestone.at)}
                      {milestone.end !== undefined &&
                        milestone.end !== milestone.at && (
                          <> – {time(milestone.end)}</>
                        )}
                    </strong>
                    <span>
                      {date(milestone.at)}
                      {milestone.end !== undefined &&
                        date(milestone.end) !== date(milestone.at) && (
                          <> → {date(milestone.end)}</>
                        )}
                    </span>
                  </div>
                  <div>
                    <h3>{milestone.label}</h3>
                    <p>{milestone.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
