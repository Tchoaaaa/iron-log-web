// Local browser regression checks. Supabase traffic is intercepted; no real users or data are modified.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const env = await readFile(new URL("../.env", import.meta.url), "utf8");
const apiUrl = env.match(/^VITE_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
assert(apiUrl, "VITE_SUPABASE_URL is required");
const base = process.env.VERIFY_URL || "http://127.0.0.1:5175";
const output = fileURLToPath(new URL("../verification/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
  timezoneId: "Europe/Paris",
});
const user = {
  id: "11111111-1111-4111-8111-111111111111",
  aud: "authenticated",
  role: "authenticated",
  email: "test@example.invalid",
  email_confirmed_at: "2026-09-01T12:00:00Z",
  user_metadata: { auto_rest: false },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: "2026-09-01T12:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 31536000;
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
    "base64url",
  ),
  Buffer.from(
    JSON.stringify({ sub: user.id, aud: "authenticated", exp }),
  ).toString("base64url"),
  "local-fixture",
].join(".");
const session = {
  access_token: token,
  refresh_token: "local-test",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: exp,
  user,
};
let failPlan = false;
const db = {
  profile: {
    id: user.id,
    display_name: "Adam",
    age: 28,
    weight_kg: 75,
    height_cm: 178,
    daily_steps: 8000,
  },
  templates: ["Push", "Pull", "Legs"].map((name, i) => ({
    id: `tpl-${i + 1}`,
    name,
    exercises: [{ name: "Squat", sets: 1, targets: [10], rest: 60 }],
  })),
  workouts: [],
  calls: [],
};
await context.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const body = req.postDataJSON();
  db.calls.push({ path: url.pathname, method, body });
  const json = (data, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (url.pathname === "/auth/v1/user") {
    if (method === "PUT") {
      if (failPlan)
        return json({ message: "Échec de synchronisation test" }, 500);
      Object.assign(user.user_metadata, body.data);
    }
    return json(user);
  }
  if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (url.pathname === "/auth/v1/token") return json(session);
  if (url.pathname === "/auth/v1/signup") return json({ user, session: null });
  if (url.pathname === "/auth/v1/resend") return json({});
  if (url.pathname === "/rest/v1/profiles") {
    if (method === "PATCH") {
      Object.assign(db.profile, body);
      return json(db.profile);
    }
    return json([db.profile]);
  }
  if (url.pathname === "/rest/v1/admins") return json([]);
  if (url.pathname === "/rest/v1/exercises")
    return json([
      { name: "Squat", category: "Jambes" },
      { name: "Row", category: "Dos" },
      { name: "Bench", category: "Pectoraux" },
    ]);
  if (url.pathname === "/rest/v1/templates") {
    if (method === "POST") {
      const saved = { id: "tpl-1", ...body };
      db.templates.push(saved);
      return json(saved);
    }
    if (method === "PATCH") {
      Object.assign(db.templates[0], body);
      return json(db.templates[0]);
    }
    return json(db.templates);
  }
  if (url.pathname === "/rest/v1/workouts") {
    if (method === "POST") {
      const saved = { id: `workout-${db.workouts.length + 1}`, ...body };
      db.workouts.unshift(saved);
      return json(saved);
    }
    if (method === "PATCH") {
      Object.assign(db.workouts[0], body);
      return json(db.workouts[0]);
    }
    return json(db.workouts);
  }
  return json({ message: `Unexpected mocked endpoint ${url.pathname}` }, 400);
});
const storageKey = `sb-${new URL(apiUrl).hostname.split(".")[0]}-auth-token`;
await context.addInitScript(
  ({ key, session }) => {
    if (!sessionStorage.getItem("fixture-init")) {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem("fixture-init", "1");
    }
  },
  { key: storageKey, session },
);
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) =>
  page.screenshot({
    path: `${output}${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
const expectVisible = async (locator) => {
  await locator.waitFor({ state: "visible", timeout: 10000 });
};
const click = (name) => page.getByRole("button", { name, exact: true }).click();

await page.clock.install({ time: new Date("2026-09-14T10:00:00Z") });
const planning = page.getByRole("region", { name: "Planning hebdomadaire" });
const count = async (text) => {
  await page.waitForFunction(
    (t) =>
      document
        .querySelector(".week-count")
        ?.textContent.replace(/\s+/g, " ")
        .includes(t),
    text,
  );
};
try {
  await page.goto(base);
  await click("Organiser ma semaine");
  await page.getByLabel("Séance du lundi").selectOption("tpl-1");
  await click("Annuler");
  assert.equal(user.user_metadata.training_plan, undefined);
  await click("Organiser ma semaine");
  for (const [day, id] of [
    ["lundi", "tpl-1"],
    ["mercredi", "tpl-2"],
    ["vendredi", "tpl-3"],
  ])
    await page.getByLabel(`Séance du ${day}`).selectOption(id);
  await shot("weekly-setup");
  await click("Enregistrer");
  await count("0 / 3");
  assert.equal(
    user.user_metadata.training_plan.weekly_template.monday,
    "tpl-1",
  );
  await page.reload();
  await count("0 / 3");
  console.log(
    "PASS: configure three days, cancel, save and reload persisted metadata",
  );
  await planning.getByRole("button", { name: /Mercredi, Pull/ }).click();
  await page.getByLabel("Déplacer cette semaine").selectOption("thursday");
  await click("Déplacer la séance");
  await expectVisible(
    planning.getByRole("button", { name: "Mercredi, Pull, Déplacée" }),
  );
  assert.equal(
    user.user_metadata.training_plan.weekly_template.wednesday,
    "tpl-2",
  );
  await count("0 / 3");
  await shot("weekly-home-light");
  await click("Démarrer la séance du jour");
  await page
    .getByLabel("Squat, série 1, charge en kg", { exact: true })
    .fill("50");
  await page
    .getByLabel("Squat, série 1, répétitions réalisées", { exact: true })
    .fill("10");
  await click("Valider Squat, série 1");
  await click("Terminer la séance");
  assert.equal(db.workouts.length, 0);
  await click("Oui, terminer la séance");
  await expectVisible(page.getByText("SÉANCE TERMINÉE", { exact: false }));
  await page.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((k) => k.endsWith("-auth-token")),
        ),
      ).user.user_metadata.training_plan.current_week.days.monday.workoutId,
  );
  assert.equal(
    user.user_metadata.training_plan.current_week.days.monday.workoutId,
    db.workouts[0].id,
  );
  await page
    .getByRole("button")
    .filter({ hasText: /Continuer|Terminé|Fermer|historique/i })
    .last()
    .click();
  await click("Accueil");
  await count("1 / 3");
  console.log(
    "PASS: move preserves recurring plan; completing planned session requires confirmation and links history",
  );
  db.workouts.push({
    id: "free-1",
    name: "Séance libre",
    performed_at: "2026-09-14T09:00:00Z",
    duration_min: 12,
    exercises: [],
  });
  await page.reload();
  await count("1 / 3");
  await planning.getByRole("button", { name: /Jeudi, Pull/ }).click();
  await page.getByLabel("Associer une séance terminée").selectOption("free-1");
  await click("Associer à ce jour");
  await count("2 / 3");
  db.templates[2].name = "Jambes";
  await page.reload();
  await expectVisible(
    planning.getByRole("button", { name: /Vendredi, Jambes/ }),
  );
  db.templates.pop();
  await page.reload();
  await expectVisible(
    planning.getByRole("button", { name: /Vendredi, Séance supprimée/ }),
  );
  console.log(
    "PASS: unplanned workout does not count automatically; explicit association, rename and deletion work",
  );
  await page.clock.setFixedTime(new Date("2026-09-19T10:00:00Z"));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expectVisible(
    planning.getByRole("button", {
      name: "Vendredi, Séance supprimée, Manquée",
    }),
  );
  await page.clock.setFixedTime(new Date("2026-09-21T10:00:00Z"));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await count("0 / 3");
  await expectVisible(
    planning.getByRole("button", { name: "Mercredi, Pull, À venir" }),
  );
  await page.waitForFunction(
    () =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((k) => k.endsWith("-auth-token")),
        ),
      ).user.user_metadata.training_plan.current_week.start === "2026-09-21",
  );
  await page.reload();
  await count("0 / 3");
  await click("Modifier la semaine");
  await page.getByLabel("Séance du vendredi").selectOption("");
  failPlan = true;
  await click("Enregistrer");
  await expectVisible(page.getByRole("alert"));
  assert.equal(
    user.user_metadata.training_plan.weekly_template.friday,
    "tpl-3",
  );
  failPlan = false;
  await click("Enregistrer");
  await count("0 / 2");
  console.log(
    "PASS: missed remains visible, next week resets from recurring plan, failed save retains draft and supports retry",
  );
  await click("Démarrer la séance du jour");
  await page
    .getByLabel("Squat, série 1, charge en kg", { exact: true })
    .fill("40");
  await page
    .getByLabel("Squat, série 1, répétitions réalisées", { exact: true })
    .fill("8");
  await click("Valider Squat, série 1");
  failPlan = true;
  await click("Terminer la séance");
  await click("Oui, terminer la séance");
  await expectVisible(page.getByText("SÉANCE TERMINÉE", { exact: false }));
  await expectVisible(page.getByText(/Son association au planning a échoué/));
  assert.equal(db.workouts.length, 3);
  failPlan = false;
  await click("Terminé");
  await click("Accueil");
  assert.equal(
    await page
      .getByRole("button", { name: "Reprendre ma séance", exact: true })
      .count(),
    0,
  );
  console.log(
    "PASS: planning write failure preserves the saved workout and clears the active session",
  );
  await page.setViewportSize({ width: 320, height: 780 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await shot("weekly-home-small");
  await page.emulateMedia({ colorScheme: "dark" });
  await shot("weekly-home-dark");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: 320px mobile layout, light/dark screenshots, no runtime errors",
  );
} finally {
  await browser.close();
}
