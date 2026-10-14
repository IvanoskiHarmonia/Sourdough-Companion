export const BASE = { starter: 250, water: 725, flour: 1000, salt: 25 };
export const MAX_STARTER = 100_000;
export function parseAmount(raw: string): number | null {
  const value = raw.trim().replace(",", ".");
  if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 && amount <= MAX_STARTER
    ? amount
    : null;
}
export function scaleRecipe(starter: number) {
  if (!Number.isFinite(starter) || starter <= 0 || starter > MAX_STARTER)
    throw new Error("Enter a positive starter amount up to 100,000 g.");
  const multiplier = starter / BASE.starter;
  const water = BASE.water * multiplier;
  const flour = BASE.flour * multiplier;
  const salt = BASE.salt * multiplier;
  return {
    starter,
    water,
    flour,
    salt,
    total: starter + water + flour + salt,
    multiplier,
  };
}
export function feedStarter(amount: number, mode: "existing" | "target") {
  if (!Number.isFinite(amount) || amount <= 0 || amount > MAX_STARTER)
    throw new Error("Enter a positive amount up to 100,000 g.");
  const portion = mode === "existing" ? amount : amount / 3;
  return {
    existing: portion,
    water: portion,
    flour: portion,
    total: mode === "existing" ? amount * 3 : amount,
  };
}
export function grams(amount: number) {
  const displayed = Number(amount.toFixed(3));
  const approximate =
    Math.abs(displayed - amount) >
    Math.max(1e-10, Math.abs(amount) * Number.EPSILON * 4);
  return `${approximate ? "≈ " : ""}${new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(displayed)} g`;
}
export function loafPlan(total: number) {
  const count = Math.max(1, Math.round(total / 1000));
  return { count, weight: total / count };
}
export type Step = {
  id: string;
  day: 1 | 2;
  title: string;
  text: string;
  tip?: string;
  ingredients?: { name: string; amount: number }[];
  minutes?: number;
  timerLabel?: string;
};
export function recipeSteps(starter: number): Step[] {
  const r = scaleRecipe(starter);
  const f = feedStarter(starter, "target");
  const loaf = loafPlan(r.total);
  return [
    {
      id: "feed",
      day: 1,
      title: "Wake up your starter",
      text: `Feed ${grams(f.existing)} existing starter with ${grams(f.water)} water and ${grams(f.flour)} flour. This makes ${grams(starter)} fed starter for your dough. Wait until bubbly and significantly risen, typically around 4 hours.`,
      ingredients: [
        { name: "Existing starter", amount: f.existing },
        { name: "Water", amount: f.water },
        { name: "Flour", amount: f.flour },
      ],
      minutes: 240,
      timerLabel: "Starter activation",
      tip: "Already have active starter? You can complete this step. Feed a little extra if you want to keep some for your next bake.",
    },
    {
      id: "mix",
      day: 1,
      title: "Starter, meet water",
      text: `Mix ${grams(r.starter)} active starter with ${grams(r.water)} warm water in a large bowl until the starter is dispersed.`,
      ingredients: [
        { name: "Active starter", amount: r.starter },
        { name: "Warm water", amount: r.water },
      ],
      tip: "Use comfortably warm water, never hot.",
    },
    {
      id: "flour",
      day: 1,
      title: "Bring in the flour",
      text: `Add ${grams(r.flour)} bread flour. Mix until no dry patches remain. A shaggy dough is exactly what you want.`,
      ingredients: [{ name: "Bread flour", amount: r.flour }],
    },
    {
      id: "salt",
      day: 1,
      title: "A little salt",
      text: `Add ${grams(r.salt)} salt and work it evenly into the dough.`,
      ingredients: [{ name: "Salt", amount: r.salt }],
    },
    {
      id: "rest",
      day: 1,
      title: "Let the dough rest",
      text: "Cover the bowl and rest for 1 hour. The flour will hydrate and the dough will start to relax.",
      minutes: 60,
      timerLabel: "Initial rest",
    },
    ...[1, 2, 3, 4].map(
      (round): Step => ({
        id: `fold-${round}`,
        day: 1,
        title: `Stretch & fold · round ${round}`,
        text: `With damp hands, lift one side of the dough and fold it over itself. Rotate the bowl and repeat for four folds total. This is round ${round} of 4.${round < 4 ? " Cover and wait 30 minutes before the next round." : " All four rounds are done. Cover the dough for bulk fermentation."}`,
        ...(round < 4
          ? { minutes: 30, timerLabel: `After fold ${round}` }
          : {}),
        tip: "Stretch gently, stopping before the dough tears.",
      }),
    ),
    {
      id: "bulk",
      day: 1,
      title: "Give it time to grow",
      text: "Cover and bulk ferment for approximately 4 hours, until the dough is airy, visibly risen, and jiggly.",
      minutes: 240,
      timerLabel: "Bulk fermentation",
      tip: "Watch the dough, not just the clock. Room temperature and starter strength change how long proofing takes.",
    },
    {
      id: "shape",
      day: 1,
      title: "Shape your loaf",
      text: `You have ${grams(r.total)} dough. ${loaf.count === 1 ? `Shape it into one loaf of ${grams(loaf.weight)}.` : `Divide into ${loaf.count} equal loaves of ${grams(loaf.weight)} each, then shape.`} Place seam-side up in floured proofing baskets or towel-lined bowls.`,
      ingredients: [
        { name: "Total dough", amount: r.total },
        { name: "Per loaf", amount: loaf.weight },
      ],
      tip: "The original recipe makes two 1,000 g loaves. Smaller loaves may bake faster; larger loaves may need longer. Bake in batches if needed.",
    },
    {
      id: "proof",
      day: 1,
      title: "Tuck it in for the night",
      text: "Cover and refrigerate for approximately 8–12 hours. The default timer is 10 hours; you can adjust it to your schedule.",
      minutes: 600,
      timerLabel: "Overnight proof",
      tip: "Time is a guide. Check that the dough is appropriately proofed before baking.",
    },
    {
      id: "preheat",
      day: 2,
      title: "Get the oven ready",
      text: "Preheat your oven and Dutch oven to 450°F / 232°C. Let the Dutch oven heat thoroughly before adding the dough.",
      tip: "Use oven mitts: the lid and handles will be very hot.",
    },
    {
      id: "score",
      day: 2,
      title: "Turn out & score",
      text: "Turn the cold dough onto parchment paper. Score the top with a bread lame or sharp blade, then carefully lower it into the hot Dutch oven.",
    },
    {
      id: "covered",
      day: 2,
      title: "Bake with the lid on",
      text: `Bake at 450°F / 232°C, covered, for approximately 35 minutes for an original-sized 1,000 g loaf. Your planned loaf is ${grams(loaf.weight)}. Adjust the baking time if your loaf is smaller or larger.`,
      minutes: 35,
      timerLabel: "Covered bake",
      tip: "If baking multiple loaves, repeat the preheat, score, and bake steps for each batch; restart the timers as needed.",
    },
    {
      id: "uncovered",
      day: 2,
      title: "Make it golden",
      text: "Carefully remove the lid and bake another 3–5 minutes if needed to brown the crust. Start with 4 minutes and watch the color.",
      minutes: 4,
      timerLabel: "Uncovered bake",
    },
    {
      id: "cool",
      day: 2,
      title: "The hardest part: wait",
      text: "Let the bread cool on a wire rack for at least 1 hour before slicing. Give the crumb time to set, then enjoy what you made.",
      minutes: 60,
      timerLabel: "Cooling",
      tip: "A little patience makes a better slice.",
    },
  ];
}
