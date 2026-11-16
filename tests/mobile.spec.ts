import { expect, test, type Page } from "@playwright/test";

async function checkNoOverflow(page: Page) {
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
}
async function checkFormBounds(page: Page) {
  const problems = await page
    .locator(
      'main input:not([type="checkbox"]), main select, dialog[open] input:not([type="checkbox"])',
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const r = element.getBoundingClientRect();
        if (!r.width || !r.height) return [];
        const container = element.closest(".card, dialog, .session-select")!;
        const box = container.getBoundingClientRect();
        const css = getComputedStyle(container);
        const left =
          box.left +
          parseFloat(css.paddingLeft) +
          parseFloat(css.borderLeftWidth);
        const right =
          box.right -
          parseFloat(css.paddingRight) -
          parseFloat(css.borderRightWidth);
        const issues = [];
        if (r.left < left - 1 || r.right > right + 1)
          issues.push(
            `${element.id || element.getAttribute("aria-label")}: outside container padding`,
          );
        if (parseFloat(getComputedStyle(element).fontSize) < 16)
          issues.push(`${element.id}: text smaller than 16px`);
        return issues;
      }),
    );
  expect(problems).toEqual([]);
}

test("phone forms and navigation fit in both themes, including the native date control", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone-specific layout checks");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const theme of ["light", "dark"]) {
    if (theme === "dark")
      await page.getByRole("button", { name: "Switch to dark mode" }).click();
    for (const label of [
      "Recipe calculator",
      "Starter feeding",
      "Full recipe",
      "Cooking mode",
      "Baking schedule",
      "Your timers",
    ]) {
      await page.getByRole("link", { name: label, exact: true }).click();
      await checkNoOverflow(page);
      await checkFormBounds(page);
      const tabs = await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link")
        .evaluateAll((links) =>
          links.map((link) => {
            const r = link.getBoundingClientRect();
            return {
              width: r.width,
              height: r.height,
              bottom: r.bottom,
              top: r.top,
            };
          }),
        );
      for (const tab of tabs) {
        expect(tab.width).toBeGreaterThanOrEqual(44);
        expect(tab.height).toBeGreaterThanOrEqual(44);
        expect(tab.top).toBeGreaterThanOrEqual(0);
        expect(tab.bottom).toBeLessThanOrEqual(
          await page.evaluate(() => innerHeight),
        );
      }
      if (label === "Baking schedule") {
        const input = page.getByLabel("When will you feed your starter?");
        await input.fill("2026-11-13T17:15");
        await expect(
          page.getByRole("region", { name: "Last fold estimate" }),
        ).toContainText("12:20 AM");
        // Desktop WebKit does not reproduce iOS's native sizing bug. Guard the
        // zero-padding/native-appearance fix as well as rendered containment.
        await expect(input).toHaveCSS("padding-left", "0px");
        await expect(input).toHaveCSS("padding-right", "0px");
        await expect(input).toHaveCSS("appearance", "none");
        await page
          .getByText("Adjust timing estimates", { exact: true })
          .click();
        await checkFormBounds(page);
        await page.getByLabel("Starter activation (hours)").fill("3");
        await expect(
          page.getByRole("region", { name: "Last fold estimate" }),
        ).toContainText("11:20 PM");
        await page.getByLabel("Starter activation (hours)").fill("4");
        await page
          .getByText("Adjust timing estimates", { exact: true })
          .click();
      }
    }
  }
});

test("phone bake dialog, session picker and timer controls remain usable at reduced height", async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, "Phone-specific keyboard/layout check");
  await page.goto("/");
  await page.getByRole("button", { name: "Let’s bake" }).click();
  await page.getByRole("button", { name: "Add bake" }).click();
  // Approximate the reduced viewport while the on-screen keyboard is open.
  await page.setViewportSize({ width: 393, height: 390 });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.getByLabel("Bake name").fill("Weekend bread for family");
  await page.getByLabel("Active starter for this bake").fill("100");
  await checkFormBounds(page);
  await checkNoOverflow(page);
  await page.getByRole("button", { name: "Start bake", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 393, height: 659 });
  await checkFormBounds(page);
  await page.getByRole("button", { name: "Start timer", exact: true }).click();
  await page.getByRole("link", { name: "Your timers", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Pause Weekend bread for family · Starter activation",
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Resume Weekend bread for family · Starter activation",
    }),
  ).toBeVisible();
  await checkNoOverflow(page);
  await page.getByRole("button", { name: "Choose a timer" }).click();
  await checkFormBounds(page);
});
