// Local browser checks for the P1 fixes from the 2026-09-14 UX audit:
// rest/validation no longer fires mid-keystroke, and the finish-session
// drawer warns about sets with partial data instead of silently dropping
// them. Supabase traffic is intercepted; no real users or data are touched.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { readFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const env = await readFile(new URL("../.env", import.meta.url), "utf8");
const apiUrl = env.match(/^VITE_SUPABASE_URL=["']?([^\s"']+)/m)?.[1];
assert(apiUrl, "VITE_SUPABASE_URL is required");
const base = process.env.VERIFY_URL || "http://localhost:5178";
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
  user_metadata: { auto_rest: true },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: "2026-09-01T12:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 31536000;
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp })).toString("base64url"),
  "local-fixture",
].join(".");
const session = { access_token: token, refresh_token: "local-test", token_type: "bearer", expires_in: 3600, expires_at: exp, user };
const db = {
  profile: { id: user.id, display_name: "Adam", age: 28, weight_kg: 75, height_cm: 178, daily_steps: 8000 },
  templates: [{ id: "tpl-1", name: "Push", exercises: [{ name: "Développé couché", sets: 2, targets: [8, 8], rest: 90 }] }],
  workouts: [],
};
await context.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const body = req.postDataJSON();
  const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (url.pathname === "/auth/v1/token") return json(session);
  if (url.pathname === "/rest/v1/profiles") return json([db.profile]);
  if (url.pathname === "/rest/v1/admins") return json([]);
  if (url.pathname === "/rest/v1/exercises") return json([{ name: "Développé couché", category: "Pectoraux" }]);
  if (url.pathname === "/rest/v1/templates") return json(db.templates);
  if (url.pathname === "/rest/v1/workouts") {
    if (method === "POST") {
      const saved = { id: "workout-1", ...body };
      db.workouts.unshift(saved);
      return json(saved);
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
const shot = (name) => page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: "disabled" });
page.setDefaultTimeout(10000);

try {
  await page.goto(base);
  await page.getByRole("button", { name: "Séances", exact: true }).click();
  await page.getByRole("button", { name: /^Push/ }).click();

  // Accent-insensitive search: "developpe" (no accent) should still find
  // "Développé couché" in the exercise picker (tested here, before locking
  // into the session, where the template's exercise list can't be edited).
  await page.getByRole("button", { name: "Ajouter un exercice", exact: true }).click();
  await page.getByRole("button", { name: "Choisir un exercice Changer" }).click();
  await page.getByLabel("Rechercher un exercice", { exact: true }).fill("developpe");
  await assert.ok(
    await page.locator(".exercise-option").filter({ hasText: "Développé couché" }).isVisible(),
    "accent-insensitive search should surface Développé couché",
  );
  await shot("audit-03-accent-insensitive-search");
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "START", exact: true }).click();

  const weightField = page.getByLabel("Développé couché, série 1, charge en kg", { exact: true });
  const repsField = page.getByLabel("Développé couché, série 1, répétitions réalisées", { exact: true });
  const checkButton = page.locator(".set-row").first().locator(".set-check");

  // Type weight and reps character by character — no rest, no validation
  // should happen until the field is actually left.
  await weightField.pressSequentially("40", { delay: 30 });
  await repsField.pressSequentially("12", { delay: 30 });
  await page.waitForTimeout(150);
  assert.equal(await page.locator(".rest-panel").filter({ hasText: "TEMPS DE REPOS" }).count(), 0, "typing alone must not start rest");
  assert.equal(await checkButton.getAttribute("aria-pressed"), "false", "typing alone must not validate the set");

  // Leaving the field (blur) with a complete value validates it and starts rest.
  await repsField.blur();
  await page.waitForTimeout(150);
  assert.equal(await checkButton.getAttribute("aria-pressed"), "true", "blurring a complete set should auto-validate it");
  assert.equal(await page.locator(".rest-panel").filter({ hasText: "TEMPS DE REPOS" }).count(), 1, "auto-validating should start rest (autoRest is on)");
  await shot("audit-01-blur-validates");

  // Fill set 2 with reps only (no charge) — a partial, unsaveable set — then
  // try to finish: the confirmation must name it instead of staying generic.
  const reps2 = page.getByLabel("Développé couché, série 2, répétitions réalisées", { exact: true });
  await reps2.fill("10");
  await reps2.blur();
  await page.getByRole("button", { name: /Terminer la séance/, exact: true }).click();
  await shot("audit-02-incomplete-warning");
  await assert.ok(
    await page.getByText("Développé couché, série 2").isVisible(),
    "finish confirmation should name the incomplete set instead of a generic warning",
  );
  assert.equal(await page.getByText(/1 série incomplète/).isVisible(), true);
  await page.getByRole("button", { name: "Continuer la séance", exact: true }).click();

  assert.deepEqual(errors, []);
  console.log("PASS: typing alone never validates/rests, blur does, incomplete sets are named before finishing, accent-insensitive search works.");
} catch (error) {
  await shot("audit-failure");
  console.error((await page.locator("body").innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
