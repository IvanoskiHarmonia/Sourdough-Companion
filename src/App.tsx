import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { BreadArt, Icon, type IconName } from "./Icons";
import {
  feedStarter,
  grams,
  loafPlan,
  parseAmount,
  recipeSteps,
  scaleRecipe,
  type Step,
} from "./recipe";
import {
  loadState,
  activeSession,
  updateActive,
  removeActive,
  remainingTime,
  saveState,
  timerText,
  type SavedState,
  type Timer,
} from "./storage";

import {
  bakeProgress,
  createSession,
  navigateStep,
  scopedStep,
  timerSteps,
} from "./baking";

type Page = "home" | "feeding" | "recipe" | "cooking" | "timers";
const nav: { id: Page; label: string; short: string; icon: IconName }[] = [
  { id: "home", label: "Recipe calculator", short: "Home", icon: "calculator" },
  { id: "feeding", label: "Starter feeding", short: "Feed", icon: "jar" },
  { id: "recipe", label: "Full recipe", short: "Recipe", icon: "book" },
  { id: "cooking", label: "Cooking mode", short: "Bake", icon: "chef" },
  { id: "timers", label: "Your timers", short: "Timers", icon: "timer" },
];
function pageFromHash(): Page {
  const id = window.location.hash.slice(1);
  return nav.some((n) => n.id === id) ? (id as Page) : "home";
}
function useNow() {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 1000);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);
  return now;
}
function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
    const dialog = ref.current;
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} onCancel={close} aria-labelledby="dialog-title">
      <div className="dialog-top">
        <h2 id="dialog-title">{title}</h2>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={close}
        >
          <Icon name="close" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
function AmountInput({
  id,
  label,
  value,
  setValue,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  setValue: (value: string) => void;
  disabled?: boolean;
}) {
  const valid = parseAmount(value) !== null;
  return (
    <div className="amount-field">
      <label htmlFor={id}>{label}</label>
      <div className={`number-input ${!valid ? "invalid" : ""}`}>
        <input
          id={id}
          inputMode="decimal"
          type="text"
          autoComplete="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!valid}
          aria-describedby={`${id}-help`}
        />
        <span>grams</span>
      </div>
      <p id={`${id}-help`} className={!valid ? "error" : "input-help"}>
        {!valid
          ? "Enter an amount greater than 0, up to 100,000 g."
          : disabled
            ? "Recipe locked for your bake. Unlock it in cooking mode to edit."
            : "Decimals welcome. Everything below adjusts automatically."}
      </p>
    </div>
  );
}
function Ingredient({
  name,
  amount,
  icon,
  note,
}: {
  name: string;
  amount: number;
  icon?: IconName;
  note?: string;
}) {
  return (
    <div className="ingredient">
      {icon && (
        <span className="ingredient-icon">
          <Icon name={icon} size={25} />
        </span>
      )}
      <div>
        <span className="ingredient-name">{name}</span>
        {note && <small>{note}</small>}
      </div>
      <strong>{grams(amount)}</strong>
    </div>
  );
}
function TimerControl({
  step,
  timer,
  now,
  start,
  change,
}: {
  step: Step;
  timer?: Timer;
  now: number;
  start: (step: Step, minutes: number) => void;
  change: (id: string, action: "pause" | "resume" | "remove") => void;
}) {
  const [minutes, setMinutes] = useState(String(step.minutes));
  const valid =
    Number.isFinite(Number(minutes)) &&
    Number(minutes) > 0 &&
    Number(minutes) <= 2880;
  if (timer)
    return (
      <div
        className={`inline-timer ${remainingTime(timer, now) === 0 ? "finished" : ""}`}
      >
        <div>
          <span className="eyebrow">
            {remainingTime(timer, now) === 0
              ? "Time is up"
              : timer.status === "paused"
                ? "Timer paused"
                : timer.label}
          </span>
          <strong>{timerText(remainingTime(timer, now))}</strong>
        </div>
        <div className="timer-actions">
          {remainingTime(timer, now) > 0 ? (
            <button
              className="icon-button"
              aria-label={`${timer.status === "running" ? "Pause" : "Resume"} ${timer.label}`}
              onClick={() =>
                change(
                  timer.id,
                  timer.status === "running" ? "pause" : "resume",
                )
              }
            >
              <Icon name={timer.status === "running" ? "pause" : "play"} />
            </button>
          ) : (
            <button
              className="small-button"
              onClick={() => start(step, timer.durationMs / 60000)}
            >
              Restart
            </button>
          )}
          <button
            className="icon-button"
            aria-label={`Remove ${timer.label} timer`}
            onClick={() => change(timer.id, "remove")}
          >
            <Icon name="close" />
          </button>
        </div>
      </div>
    );
  return (
    <div className="timer-start">
      <label>
        Minutes
        <input
          aria-label={`${step.timerLabel} minutes`}
          type="number"
          min="0.01"
          max="2880"
          step="any"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </label>
      <button
        className="secondary"
        disabled={!valid}
        onClick={() => start(step, Number(minutes))}
      >
        <Icon name="timer" size={19} />
        Start timer
      </button>
      {!valid && (
        <small className="error">
          Choose a time above 0 and up to 2,880 minutes.
        </small>
      )}
    </div>
  );
}
export default function App() {
  const [state, setState] = useState<SavedState>(loadState);
  const [page, setPage] = useState<Page>(pageFromHash);
  const [theme, setTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  const [saveError, setSaveError] = useState(false);
  const [offlineAvailable, setOfflineAvailable] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [modal, setModal] = useState<"reset" | "install" | "new-bake" | null>(
    null,
  );
  const [newStarter, setNewStarter] = useState("100");
  const [newName, setNewName] = useState("");
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState(() =>
    "Notification" in window ? Notification.permission : "denied",
  );
  const [showTimerChoices, setShowTimerChoices] = useState(false);
  const now = useNow();
  const main = useRef<HTMLElement>(null);
  const firstNavigation = useRef(true);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError() {
      setNotice(
        "Offline setup could not finish. Reconnect and reload to try again.",
      );
    },
  });
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let mounted = true;
    void navigator.serviceWorker.ready
      .then(() => {
        if (mounted) setOfflineAvailable(true);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);
  useEffect(() => {
    setSaveError(!saveState(state));
  }, [state]);
  useEffect(() => {
    const listener = () => setPage(pageFromHash());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (firstNavigation.current) {
      firstNavigation.current = false;
      return;
    }
    main.current?.focus();
    window.scrollTo({ top: 0 });
  }, [page]);
  useEffect(() => {
    const listener = () => setOnline(navigator.onLine);
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);
    return () => {
      window.removeEventListener("online", listener);
      window.removeEventListener("offline", listener);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#242723" : "#f8f6f0");
    try {
      localStorage.setItem("sourdough-theme", theme);
    } catch {
      /* saving warning is handled by app state */
    }
  }, [theme]);
  useEffect(() => {
    const expired = state.timers.filter(
      (t) => t.status === "running" && remainingTime(t, now) === 0,
    );
    if (!expired.length) return;
    setState((s) => ({
      ...s,
      timers: s.timers.map((t) =>
        expired.some((e) => e.id === t.id)
          ? {
              ...t,
              status: "done",
              remainingMs: 0,
              endsAt: null,
              notified: true,
            }
          : t,
      ),
    }));
    setNotice(
      `${expired.map((t) => t.label).join(", ")}: time is up. Check your dough or bread.`,
    );
    if (
      "Notification" in window &&
      Notification.permission === "granted" &&
      "serviceWorker" in navigator
    ) {
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) =>
          reg?.showNotification("Sourdough Companion", {
            body: `${expired.map((t) => t.label).join(", ")}: time is up.`,
            icon: "/icon-192.png",
            tag: "sourdough-timers",
          }),
        )
        .catch(() => {});
    }
  }, [now, state.timers]);
  const go = (next: Page) => {
    window.location.hash = next;
    setPage(next);
  };
  const selectedSession = activeSession(state);
  const inputAmount = parseAmount(state.starter);
  const amount = selectedSession?.locked
    ? selectedSession.starter
    : inputAmount;
  const recipe = amount === null ? null : scaleRecipe(amount);
  const steps = recipeSteps(
    selectedSession?.starter ?? amount ?? 250,
    selectedSession?.legacyLoaves?.length,
  );
  const availableTimers = timerSteps(steps, selectedSession);
  const progress = selectedSession ? bakeProgress(selectedSession) : null;
  const running = state.timers.filter((t) => t.status === "running").length;
  const complete = progress !== null && progress.completed === progress.total;
  const setStarter = (value: string) =>
    setState((s) => ({
      ...updateActive(s, (session) =>
        !session.locked && parseAmount(value) !== null
          ? { ...session, starter: parseAmount(value)! }
          : session,
      ),
      starter: value,
    }));
  const addBake = (starter: number, name: string) => {
    const session = createSession(starter, name);
    setState((s) => ({
      ...s,
      sessions: [...s.sessions, session],
      activeSessionId: session.id,
      starter: String(starter),
    }));
    setModal(null);
    go("cooking");
  };
  const nextBakeName = () => {
    let number = 1;
    while (state.sessions.some((s) => s.name === `Bake ${number}`)) number++;
    return `Bake ${number}`;
  };
  const openNewBake = () => {
    setNewName(nextBakeName());
    setNewStarter("100");
    setModal("new-bake");
  };
  const begin = () => {
    if (amount === null) return;
    if (!selectedSession) addBake(amount, nextBakeName());
    else go("cooking");
  };
  const startTimer = (step: Step, minutes: number) =>
    setState((s) => ({
      ...s,
      timers: [
        ...s.timers.filter((t) => t.id !== step.id),
        {
          id: step.id,
          label: step.timerLabel!,
          durationMs: minutes * 60000,
          remainingMs: minutes * 60000,
          endsAt: Date.now() + minutes * 60000,
          status: "running",
        },
      ],
    }));
  const changeTimer = (id: string, action: "pause" | "resume" | "remove") =>
    setState((s) => ({
      ...s,
      timers:
        action === "remove"
          ? s.timers.filter((t) => t.id !== id)
          : s.timers.map((t) =>
              t.id !== id
                ? t
                : action === "pause"
                  ? {
                      ...t,
                      status: "paused",
                      remainingMs: remainingTime(t),
                      endsAt: null,
                    }
                  : {
                      ...t,
                      status: "running",
                      endsAt: Date.now() + t.remainingMs,
                    },
            ),
    }));
  const timerProps = { now, start: startTimer, change: changeTimer };
  const canNotify =
    "Notification" in window &&
    "serviceWorker" in navigator &&
    !(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  const pageHeader = (eyebrow: string, title: string, sub: string) => (
    <header className="page-header">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{sub}</p>
    </header>
  );
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          main.current?.focus();
        }}
      >
        Skip to content
      </a>
      <aside className="sidebar">
        <a className="brand" href="#home" aria-label="Sourdough Companion home">
          <span className="brand-icon">
            <Icon name="bread" size={30} />
          </span>
          <span>
            Sourdough<small>COMPANION</small>
          </span>
        </a>
        <div className="sidebar-caption">
          A LITTLE FLOUR. A LITTLE PATIENCE.
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              href={`#${n.id}`}
              aria-label={n.label}
              key={n.id}
              className={page === n.id ? "active" : ""}
              aria-current={page === n.id ? "page" : undefined}
            >
              <Icon name={n.icon} />
              <span className="desktop-label">{n.label}</span>
              <span className="mobile-label">{n.short}</span>
              {n.id === "timers" && running > 0 && (
                <span className="nav-badge">{running}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Icon name="leaf" size={25} />
            <p>
              Good bread takes time.
              <br />
              <em>We’ll keep you company.</em>
            </p>
          </div>
          <button
            className="install-button"
            onClick={() => setModal("install")}
          >
            <Icon name="download" size={18} />
            Add to your home screen
          </button>
        </div>
      </aside>
      <div className="workspace">
        <div className="topbar">
          <span className="breadcrumb">YOUR EVERYDAY BAKING COMPANION</span>
          <span className="mobile-brand">
            <Icon name="bread" /> Sourdough Companion
          </span>
          <div className="topbar-right">
            <span className="connection">
              <i className={!online ? "offline" : ""} />
              {!online
                ? "Offline"
                : offlineReady || offlineAvailable
                  ? "Ready for offline"
                  : "Made for slow mornings"}
            </span>
            <button
              className="icon-button theme-toggle"
              onClick={() =>
                setTheme((t) => (t === "light" ? "dark" : "light"))
              }
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              <Icon name={theme === "light" ? "moon" : "sun"} size={20} />
            </button>
          </div>
        </div>
        <main id="main-content" ref={main} tabIndex={-1}>
          {saveError && (
            <div className="banner error" role="alert">
              Your browser couldn’t save changes. Keep this page open; progress
              may be lost when you close it. Check browser storage settings.
            </div>
          )}
          {needRefresh && (
            <div className="banner">
              <span>
                A fresh version is ready. Your saved bake will stay with you.
              </span>
              <button
                onClick={() => {
                  if (saveState(state)) void updateServiceWorker(true);
                  else setSaveError(true);
                }}
              >
                Update now
              </button>
              <button
                aria-label="Dismiss update"
                onClick={() => setNeedRefresh(false)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          )}
          {notice && (
            <div className="banner" role="status">
              <span>{notice}</span>
              <button
                aria-label="Dismiss message"
                onClick={() => setNotice("")}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          )}
          {state.sessions.length > 0 && page !== "feeding" && (
            <section className="session-switcher" aria-label="Baking sessions">
              <div className="session-select">
                <label htmlFor="active-bake">Your bakes</label>
                <select
                  id="active-bake"
                  value={state.activeSessionId ?? ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    setState((s) => ({
                      ...s,
                      activeSessionId: id,
                      starter: String(
                        s.sessions.find((b) => b.id === id)!.starter,
                      ),
                    }));
                  }}
                >
                  {state.sessions.map((bake) => (
                    <option key={bake.id} value={bake.id}>
                      {bake.name} · {grams(bake.starter)} starter ·{" "}
                      {bake.completed.length}/{steps.length} complete
                    </option>
                  ))}
                </select>
                <p>Each bake has its own recipe, progress, and timers.</p>
              </div>
              <button className="secondary" onClick={openNewBake}>
                <Icon name="plus" size={18} />
                Add bake
              </button>
            </section>
          )}
          {page === "home" && (
            <>
              <section className="hero">
                <div className="hero-copy">
                  <span className="eyebrow">
                    <span className="tiny-line" />
                    FROM STARTER TO SOMETHING SPECIAL
                  </span>
                  <h1>
                    A little starter.
                    <br />A lovely loaf.
                  </h1>
                  <p>
                    Good bread starts with what you have.
                    <br />
                    Let’s make your recipe just right.
                  </p>
                  <span className="hero-tag">
                    <Icon name="leaf" size={15} />
                    Simple ingredients. Slow, happy baking.
                  </span>
                </div>
                <BreadArt />
                <span className="handwritten">made with a little love</span>
              </section>
              <div className="section-heading">
                <div>
                  <h2>Your perfect proportions</h2>
                  <p>One number. Everything in balance.</p>
                </div>
                <span className="pill">THE EVERYDAY SOURDOUGH</span>
              </div>
              <div className="calculator-grid">
                <section className="card starter-card">
                  <span className="step-label">
                    01 <span>START WITH YOUR STARTER</span>
                  </span>
                  <AmountInput
                    id="starter"
                    label="How much active starter do you have?"
                    value={
                      selectedSession?.locked
                        ? String(selectedSession.starter)
                        : state.starter
                    }
                    setValue={setStarter}
                    disabled={!!selectedSession?.locked}
                  />
                  <div className="quick-amounts">
                    {[125, 150, 250, 500].map((g) => (
                      <button
                        key={g}
                        disabled={!!selectedSession?.locked}
                        className={amount === g ? "selected" : ""}
                        onClick={() => setStarter(String(g))}
                      >
                        {g} g
                      </button>
                    ))}
                  </div>
                  <div className="starter-tip">
                    <span>
                      <Icon name="jar" size={23} />
                    </span>
                    <p>
                      <strong>Happy starter, happy bread.</strong>Use fed,
                      active starter that’s bubbly and has risen significantly.
                    </p>
                  </div>
                  <button className="text-button" onClick={() => go("feeding")}>
                    Need to feed your starter? <Icon name="arrow" size={17} />
                  </button>
                </section>
                <section className="card recipe-card">
                  <div className="recipe-card-heading">
                    <span className="step-label">
                      02 <span>HERE’S YOUR RECIPE</span>
                    </span>
                    {recipe && (
                      <span className="loaf-count">
                        <Icon name="bread" size={18} />
                        {selectedSession?.legacyLoaves?.length ??
                          loafPlan(recipe.total).count}{" "}
                        {(selectedSession?.legacyLoaves?.length ??
                          loafPlan(recipe.total).count) === 1
                          ? "loaf"
                          : "loaves"}
                      </span>
                    )}
                  </div>
                  {recipe ? (
                    <div aria-live="polite" aria-atomic="true">
                      <Ingredient
                        name="Active starter"
                        note="Fed, bubbly & ready"
                        amount={recipe.starter}
                        icon="jar"
                      />
                      <Ingredient
                        name="Warm water"
                        amount={recipe.water}
                        icon="leaf"
                      />
                      <Ingredient
                        name="Bread flour"
                        amount={recipe.flour}
                        icon="bread"
                      />
                      <Ingredient
                        name="Salt"
                        amount={recipe.salt}
                        icon="plus"
                      />
                      <div className="total">
                        <span>Total dough</span>
                        <strong>{grams(recipe.total)}</strong>
                      </div>
                    </div>
                  ) : (
                    <div className="empty-calculation">
                      <Icon name="calculator" size={38} />
                      <p>
                        Add a valid starter amount
                        <br />
                        to see your recipe.
                      </p>
                    </div>
                  )}
                </section>
              </div>
              {recipe && (
                <div className="bake-cta">
                  <div>
                    <span className="cta-icon">
                      <Icon name="chef" size={26} />
                    </span>
                    <div>
                      <h3>
                        {selectedSession
                          ? "Your bake is right where you left it."
                          : "Apron on? Let’s make some bread."}
                      </h3>
                      <p>
                        {selectedSession
                          ? `${progress!.completed} of ${progress!.total} steps complete · automatically saved`
                          : "We’ll take it one step at a time, from the first mix to the first slice."}
                      </p>
                    </div>
                  </div>
                  <button className="primary" onClick={begin}>
                    {selectedSession ? "Continue baking" : "Let’s bake"}
                    <Icon name="arrow" size={19} />
                  </button>
                </div>
              )}
              <div className="home-footer">
                <span>
                  <Icon name="check" size={16} />
                  {saveError ? "Saving unavailable" : "Saved on this device"}
                </span>
                <span>Two days. Four ingredients. Something wonderful.</span>
                <button className="text-button" onClick={() => go("recipe")}>
                  See the full recipe <Icon name="arrow" size={16} />
                </button>
              </div>
            </>
          )}
          {page === "feeding" && (
            <>
              {pageHeader(
                "A GOOD LOAF STARTS HERE",
                "A happy, hungry starter.",
                "A simple 1:1:1 feed. Equal parts existing starter, water, and flour.",
              )}
              <div className="feeding-grid">
                <section className="card feeding-input">
                  <div
                    className="segmented"
                    role="group"
                    aria-label="Feeding calculation mode"
                  >
                    <button
                      aria-pressed={state.feedMode === "existing"}
                      className={
                        state.feedMode === "existing" ? "selected" : ""
                      }
                      onClick={() =>
                        setState((s) => ({ ...s, feedMode: "existing" }))
                      }
                    >
                      I have starter
                    </button>
                    <button
                      aria-pressed={state.feedMode === "target"}
                      className={state.feedMode === "target" ? "selected" : ""}
                      onClick={() =>
                        setState((s) => ({ ...s, feedMode: "target" }))
                      }
                    >
                      I want fed starter
                    </button>
                  </div>
                  <AmountInput
                    id="feed-amount"
                    label={
                      state.feedMode === "existing"
                        ? "How much existing starter do you have?"
                        : "How much fed starter do you want?"
                    }
                    value={state.feedAmount}
                    setValue={(value) =>
                      setState((s) => ({ ...s, feedAmount: value }))
                    }
                  />
                  <div className="callout">
                    <Icon name="info" />
                    <p>
                      <strong>Existing → fed → active</strong>Your existing
                      starter is the seed. After feeding, give it time to become
                      active before using it in bread dough.
                    </p>
                  </div>
                  {amount !== null && (
                    <button
                      className="text-button"
                      onClick={() =>
                        setState((s) => ({
                          ...s,
                          feedMode: "target",
                          feedAmount: String(amount),
                        }))
                      }
                    >
                      Calculate a feed for my {grams(amount)} recipe{" "}
                      <Icon name="arrow" size={17} />
                    </button>
                  )}
                </section>
                <section className="card">
                  <span className="step-label">YOUR 1:1:1 FEED</span>
                  {parseAmount(state.feedAmount) !== null ? (
                    (() => {
                      const f = feedStarter(
                        parseAmount(state.feedAmount)!,
                        state.feedMode,
                      );
                      return (
                        <div aria-live="polite">
                          <Ingredient
                            name="Existing starter"
                            amount={f.existing}
                            icon="jar"
                          />
                          <Ingredient
                            name="Add water"
                            amount={f.water}
                            icon="leaf"
                          />
                          <Ingredient
                            name="Add flour"
                            amount={f.flour}
                            icon="bread"
                          />
                          <div className="total">
                            <span>Fed starter after mixing</span>
                            <strong>{grams(f.total)}</strong>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <p className="empty-calculation">
                      Enter a valid amount to calculate your feed.
                    </p>
                  )}
                </section>
              </div>
              <div className="wide-note">
                <Icon name="timer" size={29} />
                <div>
                  <h3>Give it a little time.</h3>
                  <p>
                    Usually around 4 hours, depending on temperature and starter
                    strength. Look for bubbles and a significant rise. Feed a
                    little extra to keep some starter for next time.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => {
                    startTimer(steps[0], 240);
                    go("timers");
                  }}
                >
                  Start 4-hour timer
                </button>
              </div>
            </>
          )}
          {page === "recipe" && (
            <>
              {pageHeader(
                "THE SLOW & SIMPLE METHOD",
                "Your everyday sourdough.",
                "A little hands-on time. A lot of letting nature do its thing.",
              )}
              {recipe ? (
                <>
                  <div className="recipe-summary">
                    <span>
                      <Icon name="jar" />
                      {grams(recipe.starter)} active starter
                    </span>
                    <span>
                      <Icon name="bread" />
                      {selectedSession?.legacyLoaves?.length ??
                        loafPlan(recipe.total).count}{" "}
                      {(selectedSession?.legacyLoaves?.length ??
                        loafPlan(recipe.total).count) === 1
                        ? "loaf"
                        : "loaves"}{" "}
                      · {grams(recipe.total)} dough
                    </span>
                    <button className="primary" onClick={begin}>
                      {selectedSession
                        ? "Continue baking"
                        : "Start cooking mode"}
                      <Icon name="arrow" size={18} />
                    </button>
                  </div>
                  <p className="readiness-note">
                    Follow your dough’s readiness, not just the clock. All
                    quantities below match your recipe. ≈ indicates a display
                    rounded to 0.001 g; calculations retain full precision.
                  </p>
                  {[1, 2].map((day) => (
                    <section className="day-section" key={day}>
                      <div className="day-heading">
                        <span>DAY {day === 1 ? "ONE" : "TWO"}</span>
                        <h2>
                          {day === 1
                            ? "Mix, fold & rest"
                            : "Bake, cool & enjoy"}
                        </h2>
                      </div>
                      {recipeSteps(
                        recipe.starter,
                        selectedSession?.legacyLoaves?.length,
                      ).map(
                        (step, index) =>
                          step.day === day && (
                            <article className="recipe-step" key={step.id}>
                              <span className="step-number">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <div>
                                <h3>{step.title}</h3>
                                <p>{step.text}</p>
                                {step.tip && (
                                  <p className="step-tip">{step.tip}</p>
                                )}
                              </div>
                              {step.minutes && (
                                <span className="duration">
                                  <Icon name="timer" size={15} />
                                  {step.minutes >= 60
                                    ? `${step.minutes / 60} hr`
                                    : `${step.minutes} min`}
                                </span>
                              )}
                            </article>
                          ),
                      )}
                    </section>
                  ))}
                </>
              ) : (
                <div className="card">
                  <p>
                    Enter a valid starter amount to see your adjusted recipe.
                  </p>
                  <button className="primary" onClick={() => go("home")}>
                    Go to calculator
                  </button>
                </div>
              )}
            </>
          )}
          {page === "cooking" && (
            <>
              {pageHeader(
                "A LITTLE GUIDANCE, EVERY STEP",
                "Let’s bake something lovely.",
                "Your recipe, your pace. We’ll remember where you left off.",
              )}
              {!selectedSession ? (
                <section className="card empty-session">
                  <Icon name="chef" size={54} />
                  <h2>Ready when you are.</h2>
                  <p>
                    {amount === null
                      ? "Set a valid starter amount on the calculator first."
                      : `Your recipe uses ${grams(amount)} active starter. Start a bake to save your steps and lock your ingredient amounts.`}
                  </p>
                  <button
                    className="primary"
                    onClick={amount === null ? () => go("home") : begin}
                  >
                    {amount === null ? "Go to calculator" : "Start my bake"}
                    <Icon name="arrow" size={19} />
                  </button>
                </section>
              ) : (
                (() => {
                  const session = selectedSession;
                  const track = session;
                  const baseStep = steps[session.current];
                  const step = scopedStep(baseStep, session);
                  const trackPosition = session.current + 1;
                  const trackLength = steps.length;
                  return (
                    <div className="cooking-layout">
                      <section className="cooking-main">
                        <div className="progress-header">
                          <span>
                            STEP {trackPosition} OF {trackLength}
                          </span>
                          <span>{progress!.completed} complete</span>
                        </div>
                        <progress
                          max={progress!.total}
                          value={progress!.completed}
                          aria-label="Baking progress"
                        />
                        <article className="card cooking-card">
                          <div className="cooking-step-top">
                            <span className="pill">
                              DAY {step.day} ·{" "}
                              {step.day === 1 ? "MIX & REST" : "BAKE & ENJOY"}
                            </span>
                            <span className="large-step">
                              {String(trackPosition).padStart(2, "0")}
                            </span>
                          </div>
                          <Icon
                            name={
                              step.minutes
                                ? "timer"
                                : baseStep.id === "feed"
                                  ? "jar"
                                  : "bread"
                            }
                            size={38}
                          />
                          <h2>{step.title}</h2>
                          {step.ingredients && (
                            <div className="step-ingredients">
                              {step.ingredients.map((i) => (
                                <div key={i.name}>
                                  <strong>{grams(i.amount)}</strong>
                                  <span>{i.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <p className="cooking-instruction">{step.text}</p>
                          {step.tip && (
                            <div className="callout">
                              <Icon name="leaf" size={20} />
                              <p>{step.tip}</p>
                            </div>
                          )}
                          {step.minutes && (
                            <TimerControl
                              key={step.id}
                              step={step}
                              timer={state.timers.find((t) => t.id === step.id)}
                              {...timerProps}
                            />
                          )}
                          <label className="completion">
                            <input
                              type="checkbox"
                              checked={track.completed.includes(baseStep.id)}
                              onChange={(e) =>
                                setState((s) =>
                                  updateActive(s, (current) => ({
                                    ...current,
                                    completed: e.target.checked
                                      ? [...track.completed, baseStep.id]
                                      : track.completed.filter(
                                          (id) => id !== baseStep.id,
                                        ),
                                  })),
                                )
                              }
                            />
                            <span>I’ve completed this step</span>
                          </label>
                        </article>
                        <div className="step-navigation">
                          <button
                            className="secondary"
                            disabled={session.current === 0}
                            onClick={() =>
                              setState((s) =>
                                updateActive(s, (current) =>
                                  navigateStep(current, -1),
                                ),
                              )
                            }
                          >
                            <span className="back-arrow">
                              <Icon name="arrow" size={18} />
                            </span>
                            Previous
                          </button>
                          <button
                            className="primary"
                            disabled={session.current === steps.length - 1}
                            onClick={() =>
                              setState((s) =>
                                updateActive(s, (current) =>
                                  navigateStep(current, 1),
                                ),
                              )
                            }
                          >
                            Next step
                            <Icon name="arrow" size={18} />
                          </button>
                        </div>
                        {complete && (
                          <div className="bake-finished" role="status">
                            <Icon name="bread" size={32} />
                            <h2>You made something wonderful.</h2>
                            <p>All steps complete. Enjoy your bread!</p>
                            <button className="secondary" onClick={openNewBake}>
                              Start a new bake
                            </button>
                          </div>
                        )}
                      </section>
                      <aside className="bake-details">
                        <div className="card">
                          <span className="eyebrow">THIS BAKE</span>
                          <h3>{grams(session.starter)} active starter</h3>
                          <p>
                            {grams(scaleRecipe(session.starter).total)} dough ·
                            saved on this device
                          </p>
                          {session.legacyLoaves && (
                            <details className="legacy-progress">
                              <summary>
                                Progress saved from the previous loaf view
                              </summary>
                              <p>
                                These are your original records. The bake
                                checklist marks a step complete only when every
                                loaf had completed it.
                              </p>
                              {session.legacyLoaves.map((loaf, index) => (
                                <div key={index}>
                                  <strong>
                                    Loaf {index + 1} ·{" "}
                                    {steps[loaf.current].title}
                                  </strong>
                                  <p>
                                    {loaf.completed.length
                                      ? loaf.completed
                                          .map(
                                            (id) =>
                                              steps.find(
                                                (step) => step.id === id,
                                              )?.title,
                                          )
                                          .join(", ")
                                      : "No individual steps completed yet."}
                                  </p>
                                </div>
                              ))}
                            </details>
                          )}
                          <label className="lock-control">
                            <Icon
                              name={session.locked ? "lock" : "unlock"}
                              size={18}
                            />
                            <span>Lock recipe amounts</span>
                            <input
                              type="checkbox"
                              checked={session.locked}
                              onChange={(e) =>
                                setState((s) => ({
                                  ...updateActive(s, (current) => ({
                                    ...current,
                                    locked: e.target.checked,
                                  })),
                                  starter: String(session.starter),
                                }))
                              }
                            />
                          </label>
                          <p className="muted small">
                            {session.locked
                              ? "Your ingredient quantities are protected from accidental changes."
                              : "Changes in the calculator will update this bake. Lock once you start mixing."}
                          </p>
                          <button
                            className="text-button danger"
                            onClick={() => setModal("reset")}
                          >
                            <Icon name="reset" size={16} />
                            Reset baking session
                          </button>
                        </div>
                        <div className="quiet-note">
                          <Icon name="leaf" />
                          <p>
                            There’s no rush.
                            <br />
                            Good things are growing.
                          </p>
                        </div>
                      </aside>
                    </div>
                  );
                })()
              )}
            </>
          )}
          {page === "timers" && (
            <>
              {pageHeader(
                "MAKE ROOM FOR THE WAIT",
                "A little time makes magic.",
                "Set it down. Come back when it’s ready.",
              )}
              <div className="callout timer-warning">
                <Icon name="info" />
                <p>
                  Timers recover when you reopen the app. This app cannot
                  reliably alert you while closed or while your iPhone is
                  locked. Set a Clock app alarm if you need a background alert.
                </p>
              </div>
              {state.timers.length ? (
                <div className="timer-grid">
                  {state.timers.map((t) => (
                    <section className="card timer-card" key={t.id}>
                      <div className="section-heading">
                        <h3>{t.label}</h3>
                        <Icon name="timer" />
                      </div>
                      <TimerControl
                        step={
                          availableTimers.find((s) => s.id === t.id) ?? {
                            id: t.id,
                            day: 1,
                            title: t.label,
                            text: "",
                            timerLabel: t.label,
                            minutes: t.durationMs / 60000,
                          }
                        }
                        timer={t}
                        {...timerProps}
                      />
                      <small className="muted">
                        {t.status === "running" && t.endsAt
                          ? `Finishes ${new Date(t.endsAt).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                          : t.status === "paused"
                            ? "Paused. Resume whenever you’re ready."
                            : "Time is a guide. Check readiness before moving on."}
                      </small>
                    </section>
                  ))}
                </div>
              ) : (
                <section className="card empty-timers">
                  <Icon name="timer" size={46} />
                  <h2>A quiet moment in the kitchen.</h2>
                  <p>
                    No timers yet. Choose one below, or start a timer as you
                    bake.
                  </p>
                </section>
              )}
              <button
                className="secondary add-timer"
                onClick={() => setShowTimerChoices((v) => !v)}
                aria-expanded={showTimerChoices}
              >
                <Icon name={showTimerChoices ? "close" : "plus"} size={19} />
                {showTimerChoices ? "Hide timer choices" : "Choose a timer"}
              </button>
              {showTimerChoices && (
                <div className="timer-grid">
                  {availableTimers
                    .filter(
                      (s) =>
                        s.minutes && !state.timers.some((t) => t.id === s.id),
                    )
                    .map((step) => (
                      <section className="card" key={step.id}>
                        <h3>{step.timerLabel}</h3>
                        <TimerControl step={step} {...timerProps} />
                      </section>
                    ))}
                </div>
              )}
              {canNotify && (
                <div className="notification-option">
                  <p>
                    Optional browser alerts work only while the app can run.{" "}
                    {permission === "denied"
                      ? "Notifications are blocked in your browser settings."
                      : permission === "granted"
                        ? "Browser alerts are enabled."
                        : ""}
                  </p>
                  {permission === "default" && (
                    <button
                      className="text-button"
                      onClick={() => {
                        void Notification.requestPermission()
                          .then(setPermission)
                          .catch(() =>
                            setNotice(
                              "Browser alerts aren’t available. Timers will still work in the app.",
                            ),
                          );
                      }}
                    >
                      Enable browser alerts
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </main>
        <footer className="app-footer">
          <Icon name="bread" size={18} />
          <span>A little flour, water, salt & love.</span>
          {(offlineReady || offlineAvailable) && (
            <span className="offline-footer">
              <Icon name="check" size={13} />
              Ready for offline
            </span>
          )}
          <button
            className="mobile-install text-button"
            onClick={() => setModal("install")}
          >
            <Icon name="download" size={15} />
            Add to Home Screen
          </button>
          <span>SOURDOUGH COMPANION</span>
        </footer>
      </div>
      {modal === "new-bake" && (
        <Modal title="Start another bake" close={() => setModal(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const amount = parseAmount(newStarter);
              if (amount !== null && newName.trim()) addBake(amount, newName);
            }}
          >
            <p>Your current bakes will keep their progress and timers.</p>
            <label className="bake-name" htmlFor="bake-name">
              Bake name
              <input
                id="bake-name"
                value={newName}
                maxLength={60}
                required
                onChange={(e) => setNewName(e.target.value)}
              />
            </label>
            <AmountInput
              id="new-bake-starter"
              label="Active starter for this bake"
              value={newStarter}
              setValue={setNewStarter}
            />
            <div className="dialog-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
              >
                Cancel
              </button>
              <button
                className="primary"
                type="submit"
                disabled={parseAmount(newStarter) === null || !newName.trim()}
              >
                Start bake
                <Icon name="arrow" size={18} />
              </button>
            </div>
          </form>
        </Modal>
      )}
      {modal === "reset" && (
        <Modal title="Start fresh?" close={() => setModal(null)}>
          <p>
            This removes {selectedSession?.name} and its timers. Other bakes and
            their progress will stay saved.
          </p>
          <div className="dialog-actions">
            <button className="secondary" onClick={() => setModal(null)}>
              Keep baking
            </button>
            <button
              className="primary"
              onClick={() => {
                setState(removeActive);
                setModal(null);
                setNotice("Bake removed. Your other sessions are unchanged.");
                go("home");
              }}
            >
              Reset session
            </button>
          </div>
        </Modal>
      )}
      {modal === "install" && (
        <Modal title="A place in your kitchen." close={() => setModal(null)}>
          <p>
            Add Sourdough Companion to your Home Screen for a full-screen baking
            companion.
          </p>
          <ol className="install-steps">
            <li>
              Open this site’s HTTPS address in{" "}
              <strong>Safari on your iPhone</strong>.
            </li>
            <li>
              Tap <strong>Share → Add to Home Screen</strong> (you may need to
              scroll through the actions).
            </li>
            <li>
              Keep <strong>Open as Web App</strong> enabled if shown, then tap{" "}
              <strong>Add</strong>.
            </li>
            <li>
              Launch the new icon once while online. Wait for{" "}
              <strong>Ready for offline</strong>, then you can bake without a
              connection.
            </li>
          </ol>
          <p className="muted small">
            On Android or desktop, use your browser’s Install app option.
            Progress is saved in this browser on this device. Safari and an
            installed app may have separate storage.
          </p>
        </Modal>
      )}
    </div>
  );
}
