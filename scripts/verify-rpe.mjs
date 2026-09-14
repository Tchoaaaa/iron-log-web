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
const base = process.env.VERIFY_URL || "http://127.0.0.1:5177";
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
  workouts: [
    ["w5", "2026-09-12", "Push récent", 85],
    ["w4", "2026-09-08", "Push", 82.5],
    ["w3", "2026-09-02", "Push", 80],
    ["w2", "2026-08-28", "Push", 75],
    ["w1", "2026-08-20", "Push", 70],
  ].map(([id, date, name, weight], i) => ({
    id,
    performed_at: `${date}T10:00:00Z`,
    name,
    duration_min: 48,
    exercises: [
      {
        name: "Développé couché",
        sets: [
          { weight, reps: 8 },
          { weight: weight - 5, reps: 10 },
        ],
      },
      { name: "Squat", sets: [{ weight: 110 - i * 5, reps: 5 }] },
      { name: "Tractions", sets: [{ weight: 0, reps: 10 - i }] },
    ],
  })),
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
      { name: "Développé couché", category: "Pectoraux" },
      { name: "Tractions", category: "Dos" },
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
      const row = db.workouts.find(
        (w) => w.id === url.searchParams.get("id")?.replace("eq.", ""),
      );
      Object.assign(row, body);
      return json(row);
    }
    if (method === "DELETE") {
      db.workouts = db.workouts.filter(
        (w) => w.id !== url.searchParams.get("id")?.replace("eq.", ""),
      );
      return route.fulfill({ status: 204 });
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


db.templates = [];
db.workouts = [];
page.setDefaultTimeout(10000);
const rpe = (name, series) => page.getByLabel(`${name}, série ${series}, RPE ressenti`, { exact: true });
const result = async (name, series, rating) => {
  await page.getByLabel(`${name}, série ${series}, charge en kg`, { exact: true }).fill("30");
  await page.getByLabel(`${name}, série ${series}, répétitions réalisées`, { exact: true }).fill("8");
  if (rating) await rpe(name, series).selectOption(rating);
};
try {
  await page.goto(base);
  await click("Séances");
  await click("Créer une séance");
  await page.getByLabel("Nom de la séance", { exact: true }).fill("RPE test");
  await click("Ajouter un exercice");
  await click("Choisir un exercice Changer");
  await click("Squat Jambes");
  await page.getByRole("combobox", { name: "Nombre de séries" }).selectOption("2");
  await page.getByRole("checkbox", { name: /Activer le RPE/ }).check();
  await shot("rpe-01-picker");
  await click("Ajouter à la séance");
  await click("Ajouter un exercice");
  await click("Superset");
  await click("1. Choisir un exercice Changer");
  await click("Bench Pectoraux");
  await click("2. Choisir un exercice Changer");
  await click("Row Dos");
  await page.getByRole("combobox", { name: "Nombre de rounds" }).selectOption("2");
  await page.getByRole("checkbox", { name: /Activer le RPE/ }).check();
  await click("Ajouter à la séance");
  await click("Ajouter un exercice");
  await click("Choisir un exercice Changer");
  await click("Tractions Dos");
  await click("Ajouter à la séance");
  await click("Enregistrer la séance");
  assert.equal(db.templates[0].exercises[0].rpeEnabled, true);
  assert.equal(db.templates[0].exercises[1].rpeEnabled, true);
  assert.equal(db.templates[0].exercises[2].rpeEnabled, undefined);
  await page.getByRole("button", { name: /RPE test 3 exercices/ }).click();
  await click("Démarrer cette séance");
  assert.equal(await rpe("Squat", 1).inputValue(), "");
  assert.equal(await rpe("Tractions", 1).count(), 0);
  await result("Squat", 1, "6");
  await result("Squat", 2, "8");
  await result("Bench", 1, "7");
  await result("Bench", 2, "9");
  await result("Row", 1, "8");
  await result("Row", 2, "");
  await result("Tractions", 1, "");
  await page.waitForFunction(() => {
    const active = JSON.parse(localStorage.getItem("gymapp:active-session:11111111-1111-4111-8111-111111111111"));
    return active?.entries[1]?.sets[0]?.rpeB === "8" && active.entries[2].sets[0].reps === "8";
  });
  await page.reload();
  await page.getByRole("button", { name: /^Reprendre/ }).click();
  await expectVisible(rpe("Squat", 1));
  assert.equal(await rpe("Squat", 1).inputValue(), "6");
  assert.equal(await rpe("Bench", 2).inputValue(), "9");
  assert.equal(await rpe("Row", 2).inputValue(), "");
  await page.getByRole("button", { name: "+ Activer le RPE par série", exact: true }).click();
  assert.equal(await rpe("Tractions", 1).count(), 1);
  await rpe("Tractions", 1).selectOption("10");
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await shot(`rpe-02-workout-${width}-${colorScheme}`);
    }
  }
  await click("Terminer la séance");
  await click("Oui, terminer la séance");
  await expectVisible(page.getByText("SÉANCE TERMINÉE", { exact: false }));
  assert.equal(db.workouts.length, 1);
  assert.deepEqual(db.workouts[0].exercises.map(e => e.sets.map(s => s.rpe)), [[6,8],[7,9],[8,undefined],[10]]);
  await click("Terminé");
  await page.getByRole("button", { name: /RPE test/ }).click();
  await expectVisible(page.getByText("SÉANCE ENREGISTRÉE", { exact: true }));
  assert.equal(await page.getByRole("columnheader", { name: "RPE", exact: true }).count(), 4);
  await shot("rpe-03-history");
  await click("Modifier la séance");
  assert.equal(await rpe("Bench", 1).inputValue(), "7");
  assert.equal(await rpe("Row", 1).inputValue(), "8");
  await rpe("Squat", 1).selectOption("");
  await rpe("Bench", 1).selectOption("6");
  await click("Enregistrer les modifications");
  await expectVisible(page.getByText("SÉANCE ENREGISTRÉE", { exact: true }));
  assert.equal(db.workouts[0].exercises[0].sets[0].rpe, undefined);
  assert.equal(db.workouts[0].exercises[1].sets[0].rpe, 6);
  assert.equal(db.workouts[0].exercises[2].sets[0].rpe, 8);
  assert.deepEqual(errors, []);
  console.log("PASS: template opt-in, per-set and superset ratings, optional blanks, reload, locked-template activation, persistence, history edit/clear, mobile 320/390 light/dark, no browser errors.");
} catch (error) {
  await shot("rpe-failure");
  console.error((await page.locator("body").innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
