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
const base = process.env.VERIFY_URL || "http://127.0.0.1:5176";
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

await page.clock.install({ time: new Date("2026-09-13T10:00:00Z") });
const subtab = (name) => page.getByRole("tab", { name, exact: true }).click();
const title = (name) => page.getByRole("heading", { name, exact: true });
try {
  await page.goto(base);
  await click("Performance");
  await expectVisible(title("Performance"));
  assert.equal(
    await page.getByRole("button", { name: "Suivi", exact: true }).count(),
    0,
  );
  assert.equal(await page.getByRole("tab").count(), 3);
  assert.equal(
    await page
      .getByRole("tab", { name: "Aperçu" })
      .getAttribute("aria-selected"),
    "true",
  );
  await shot("performance-overview-light");
  assert.equal(await page.getByRole("button", { name: "Semaine", exact: true }).getAttribute("aria-pressed"), "true");
  await click("Semaine");
  await expectVisible(page.getByText("7 sept. 2026 — 13 sept. 2026"));
  await click("Année");
  await expectVisible(page.getByText("1 janv. 2026 — 13 sept. 2026"));
  await click("Mois");
  const progression = page
    .locator(".performance-exercise-row")
    .filter({ hasText: "Développé couché" });
  assert.match(await progression.innerText(), /85 kg/);
  assert.equal(await progression.locator("circle.chart-dot").count(), 0);

  assert.equal(await page.locator(".chart-axis-label").count(), 3);
  assert.equal(
    await page
      .locator(".performance-stats > div")
      .filter({ hasText: "Volume" })
      .locator("strong")
      .innerText(),
    "5.88 T",
  );
  assert.equal(await page.getByText(/1RM/i).count(), 0);
  await progression.click();
  await expectVisible(title("Développé couché"));
  await click("4 semaines");
  assert.equal(await page.locator(".chart-axis-label").count(), 3);
  assert.equal(await page.locator("circle.chart-dot").count(), 0);
  await shot("performance-exercise-light");
  await page
    .getByRole("button")
    .filter({ hasText: /12 sept. 2026.*Push récent/ })
    .click();
  await expectVisible(title("Push récent"));
  await click("Retour");
  await expectVisible(title("Développé couché"));
  assert.equal(
    await page
      .getByRole("button", { name: "4 semaines", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await click("Retour à Performance");
  await click("Mes records");
  await expectVisible(
    page
      .getByRole("tabpanel")
      .getByRole("button")
      .filter({ hasText: "Développé couché" }),
  );
  await page
    .getByRole("tabpanel")
    .getByRole("button")
    .filter({ hasText: "Développé couché" })
    .click();
  await click("Retour à Performance");
  assert.equal(
    await page
      .getByRole("tab", { name: "Records" })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.getByLabel("Filtrer les records par muscle").selectOption("Dos");
  assert.equal(await page.locator(".record-row").count(), 1);
  await page.locator(".record-row").filter({hasText:"Tractions"}).click();
  await click("Retour à Performance");
  assert.equal(await page.getByLabel("Filtrer les records par muscle").inputValue(), "Dos");
  await subtab("Historique"); await subtab("Records");
  assert.equal(await page.getByLabel("Filtrer les records par muscle").inputValue(), "Dos");
  await page.getByLabel("Filtrer les records par muscle").selectOption("Pectoraux");
  assert.equal(await page.locator(".record-row").count(), 1);
  assert.match(await page.locator(".record-row").innerText(), /Développé couché/);
  await page.getByLabel("Filtrer les records par muscle").selectOption("");
  assert.equal(await page.locator(".record-row").count(), 3);
  console.log("PASS: muscle filtering uses exercise library, persists through detail and sections, resets to all records");
  await shot("performance-records-light");
  console.log(
    "PASS: four main destinations, three sections, period filters, exercise and workout drill-down, context retained",
  );
  await subtab("Historique");
  await expectVisible(title("SEPTEMBRE 2026"));
  await expectVisible(title("AOÛT 2026"));
  await click("Filtres");
  await page.getByLabel("Du", { exact: true }).fill("2026-09-10");
  await click("Appliquer les filtres");
  assert.equal(
    await page.getByRole("tabpanel").locator(".list-row").count(),
    1,
  );
  await subtab("Records");
  await subtab("Historique");
  assert.equal(
    await page.getByRole("tabpanel").locator(".list-row").count(),
    1,
  );
  await click("Réinitialiser les filtres");
  await shot("performance-history-light");
  await page
    .getByRole("tabpanel")
    .getByRole("button")
    .filter({ hasText: "Push récent" })
    .click();
  await click("Modifier la séance");
  await page
    .getByLabel("Développé couché, série 1, charge en kg", { exact: true })
    .fill("90");
  await click("Enregistrer les modifications");
  await expectVisible(title("Push récent"));
  await click("Retour");
  await subtab("Records");
  await expectVisible(
    page
      .getByRole("tabpanel")
      .getByRole("button")
      .filter({ hasText: /Développé couché.*90 kg/ }),
  );
  console.log(
    "PASS: existing history month groups and filters retained; editing updates shared records",
  );
  await subtab("Historique");
  await page
    .getByRole("tabpanel")
    .getByRole("button")
    .filter({ hasText: "Push récent" })
    .click();
  await click("Supprimer la séance");
  await click("Supprimer");
  await expectVisible(title("Performance"));
  assert.equal(db.workouts.length, 4);
  await subtab("Records");
  await expectVisible(
    page
      .getByRole("tabpanel")
      .getByRole("button")
      .filter({ hasText: /Développé couché.*82,5 kg/ }),
  );
  await click("Accueil");
  await page
    .getByRole("button")
    .filter({ hasText: /Push.*8 sept. 2026/ })
    .click();
  await expectVisible(title("Push"));
  await click("Retour");
  await expectVisible(title("Bonjour, Adam."));
  await click("Voir Performance");
  assert.equal(
    await page
      .getByRole("tab", { name: "Aperçu" })
      .getAttribute("aria-selected"),
    "true",
  );
  await page.setViewportSize({ width: 320, height: 780 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await shot("performance-overview-dark");
  await subtab("Historique");
  await shot("performance-history-dark");
  await subtab("Records");
  await shot("performance-records-dark");
  await page
    .getByRole("tabpanel")
    .getByRole("button")
    .filter({ hasText: "Développé couché" })
    .click();
  await shot("performance-exercise-dark");
  await click("Retour à Performance");
  await page.getByRole("tab", { name: "Records" }).focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page
      .getByRole("tab", { name: "Aperçu" })
      .getAttribute("aria-selected"),
    "true",
  );
  console.log(
    "PASS: deletion recalculates records, Home links return correctly, keyboard tabs and 320px dark/light layouts",
  );
  db.workouts = [];
  await page.reload();
  await click("Performance");
  await expectVisible(title("Ta progression commence ici."));
  await subtab("Historique");
  await expectVisible(title("Ta première séance t’attend."));
  await subtab("Records");
  await expectVisible(title("Chaque progression compte."));
  await subtab("Aperçu");
  await click("Démarrer une séance");
  await expectVisible(
    page.getByRole("button", { name: "Terminer la séance", exact: true }),
  );
  assert.deepEqual(errors, []);
  console.log(
    "PASS: all empty states and free workout entry work, no runtime errors",
  );
} finally {
  await browser.close();
}
