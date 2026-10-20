import { test, expect } from "@playwright/test";

test("scales fractional recipes and navigates every screen", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("How much active starter do you have?").fill("125");
  await expect(page.getByText("362.5 g", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "See the full recipe" }).click();
  await expect(
    page.getByText(/Mix 125 g active starter with 362.5 g warm water/),
  ).toBeVisible();
  await page.getByRole("link", { name: /Starter feeding/ }).click();
  await page.getByRole("button", { name: "I want fed starter" }).click();
  await page.getByLabel("How much fed starter do you want?").fill("150");
  await expect(page.getByText("50 g", { exact: true })).toHaveCount(3);
  await page.getByRole("link", { name: /Cooking mode/ }).click();
  await expect(
    page.getByRole("button", { name: "Start my bake" }),
  ).toBeVisible();
  await page.getByRole("link", { name: /Your timers/ }).click();
  await expect(
    page.getByRole("heading", { name: "A little time makes magic." }),
  ).toBeVisible();
  await expect(page.locator("body")).toHaveJSProperty(
    "scrollWidth",
    await page.evaluate(() => window.innerWidth),
  );
});

test("saves cooking progress, protects quantities, and resets explicitly", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("How much active starter do you have?").fill("150");
  await page.getByRole("button", { name: "Let’s bake" }).click();
  await page.getByLabel("I’ve completed this step").check();
  await page.getByRole("button", { name: "Next step" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Starter, meet water" }),
  ).toBeVisible();
  await expect(page.getByText("1 complete", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Recipe calculator/ }).click();
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Continue baking" }).click();
  await page.getByRole("button", { name: "Reset baking session" }).click();
  await page.getByRole("button", { name: "Keep baking" }).click();
  await expect(
    page.getByRole("heading", { name: "Starter, meet water" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset baking session" }).click();
  await page
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toHaveValue("150");
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toBeEnabled();
});

test("timer deadline survives reload and pause/resume", async ({ page }) => {
  // install() starts a running clock. Leave more than the test timeout
  // before the pause target, so setup time cannot put that target in the past.
  await page.clock.install({ time: new Date("2026-10-13T11:00:00Z") });
  await page.goto("/#timers");
  await page.clock.pauseAt(new Date("2026-10-13T12:00:00Z"));
  await page.getByRole("button", { name: "Choose a timer" }).click();
  const card = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Initial rest", exact: true }),
  });
  await card.getByRole("button", { name: "Start timer" }).click();
  await expect(page.getByText("01:00:00")).toBeVisible();
  await page.clock.fastForward(120000);
  await page.reload();
  await expect(page.getByText("00:58:00")).toBeVisible();
  await page.getByRole("button", { name: "Pause Initial rest" }).click();
  await page.clock.fastForward(60000);
  await page.reload();
  await expect(page.getByText("00:58:00")).toBeVisible();
  await page.getByRole("button", { name: "Resume Initial rest" }).click();
  await page.clock.fastForward(3480001);
  await expect(page.getByText("Time is up", { exact: true })).toBeVisible();
});

test("production app reloads fully offline with saved amounts", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await page.getByLabel("How much active starter do you have?").fill("125");
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toHaveValue("125");
  await expect(page.getByText("362.5 g", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "See the full recipe" }).click();
  await expect(page.getByText(/Add 12.5 g salt/)).toBeVisible();
  await context.setOffline(false);
});

test("theme and installation help are accessible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  {
    await page
      .getByRole("button", {
        name:
          test.info().project.name === "desktop"
            ? "Add to your home screen"
            : "Add to Home Screen",
      })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
});

test("screens have no serious accessibility violations in both themes", async ({
  page,
}) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s bake" }).click();
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const label of [
      "Recipe calculator",
      "Starter feeding",
      "Full recipe",
      "Cooking mode",
      "Your timers",
    ]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        results.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => ({
            target: n.target,
            issue: n.failureSummary,
          })),
        })),
        `${theme}: ${label}`,
      ).toEqual([]);
    }
  }
});

test("50 g and 100 g bakes keep independent progress, quantities and timers offline", async ({
  page,
  context,
}) => {
  // install() starts a running clock. Leave more than the test timeout
  // before the pause target, so setup time cannot put that target in the past.
  await page.clock.install({ time: new Date("2026-10-13T11:00:00Z") });
  await page.goto("/");
  await page.clock.pauseAt(new Date("2026-10-13T12:00:00Z"));
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.getByLabel("How much active starter do you have?").fill("50");
  await page.getByRole("button", { name: "Let’s bake" }).click();
  // Session IDs stay stable when recipe steps or progress labels change.
  const firstBakeId = await page.getByLabel("Your bakes").inputValue();
  await page.getByRole("button", { name: "Start timer" }).click();
  await page.getByLabel("I’ve completed this step").check();
  await page.getByRole("button", { name: "Next step" }).click();
  await expect(page.getByText("145 g", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Add bake" }).click();
  await page.getByLabel("Active starter for this bake").fill("-1");
  await expect(
    page.getByRole("button", { name: "Start bake", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Active starter for this bake").fill("100");
  await page.getByRole("button", { name: "Start bake", exact: true }).click();
  const secondBakeId = await page.getByLabel("Your bakes").inputValue();
  expect(secondBakeId).not.toBe(firstBakeId);
  await expect(
    page.getByRole("heading", { name: "Wake up your starter" }),
  ).toBeVisible();
  await expect(page.getByLabel("I’ve completed this step")).not.toBeChecked();
  await page.getByRole("button", { name: "Start timer" }).click();
  for (let i = 0; i < 4; i++)
    await page.getByRole("button", { name: "Next step" }).click();
  await expect(
    page.getByRole("heading", { name: "Let the dough rest" }),
  ).toBeVisible();
  await page.getByLabel("Your bakes").selectOption(firstBakeId);
  await expect(
    page.getByRole("heading", { name: "Starter, meet water" }),
  ).toBeVisible();
  await expect(page.getByText("145 g", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Recipe calculator", exact: true })
    .click();
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toHaveValue("50");
  await page.getByLabel("Your bakes").selectOption(secondBakeId);
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toHaveValue("100");
  await expect(page.getByText("290 g", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Cooking mode", exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Let the dough rest" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Your timers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bake 1 · Starter activation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bake 2 · Starter activation" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause Bake 1 · Starter activation" })
    .click();
  await page.clock.fastForward(60000);
  await expect(page.getByText("04:00:00", { exact: true })).toBeVisible();
  await expect(page.getByText("03:59:00", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Cooking mode", exact: true }).click();
  await page.getByRole("button", { name: "Reset baking session" }).click();
  await page
    .getByRole("button", { name: "Reset session", exact: true })
    .click();
  await expect(
    page.getByLabel("How much active starter do you have?"),
  ).toHaveValue("50");
  await page.getByRole("button", { name: "Continue baking" }).click();
  await expect(
    page.getByRole("heading", { name: "Starter, meet water" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Your timers", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bake 1 · Starter activation" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bake 2 · Starter activation" }),
  ).toHaveCount(0);
  await context.setOffline(false);
});
