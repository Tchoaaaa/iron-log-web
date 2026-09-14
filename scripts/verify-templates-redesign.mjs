// Local browser check for the redesigned Séances screen. Supabase traffic is
// intercepted; no real users or data are touched. Not part of the test
// suite — a one-off script to visually verify the restructuring proposal.
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
  user_metadata: { auto_rest: false },
  app_metadata: { provider: "email", providers: ["email"] },
  created_at: "2026-09-01T12:00:00Z",
};
const exp = Math.floor(Date.now() / 1000) + 31536000;
const token = [
  Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
  Buffer.from(JSON.stringify({ sub: user.id, aud: "authenticated", exp })).toString("base64url"),
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
let nextId = 1;
const db = {
  profile: { id: user.id, display_name: "Adam", age: 28, weight_kg: 75, height_cm: 178, daily_steps: 8000 },
  templates: [],
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
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (url.pathname === "/auth/v1/token") return json(session);
  if (url.pathname === "/rest/v1/profiles") return json([db.profile]);
  if (url.pathname === "/rest/v1/admins") return json([]);
  if (url.pathname === "/rest/v1/exercises")
    return json([
      { name: "Développé couché", category: "Pectoraux" },
      { name: "Développé incliné haltères", category: "Pectoraux" },
      { name: "Élévations latérales", category: "Épaules" },
      { name: "Dips", category: "Triceps" },
      { name: "Extension triceps", category: "Triceps" },
      { name: "Squat", category: "Quadriceps" },
    ]);
  if (url.pathname === "/rest/v1/templates") {
    if (method === "POST") {
      const saved = { id: `tpl-${nextId++}`, ...body };
      db.templates.push(saved);
      return json(saved);
    }
    if (method === "PATCH") {
      const id = url.searchParams.get("id")?.replace("eq.", "");
      const row = db.templates.find((t) => t.id === id);
      Object.assign(row, body);
      return json(row);
    }
    if (method === "DELETE") {
      const id = url.searchParams.get("id")?.replace("eq.", "");
      db.templates = db.templates.filter((t) => t.id !== id);
      return route.fulfill({ status: 204 });
    }
    return json(db.templates);
  }
  if (url.pathname === "/rest/v1/workouts") return json(db.workouts);
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
const click = (name) => page.getByRole("button", { name, exact: true }).click();
page.setDefaultTimeout(10000);

try {
  await page.goto(base);
  await click("Séances");
  await shot("tpl-00-empty-list");

  // Create "Push" with 3 exercises — checks autosave (no explicit Save button used).
  await click("Créer ma première séance");
  await page.getByPlaceholder("Ex. Push, Jambes, Full body…").fill("Push");
  await click("Ajouter un exercice");
  await click("Choisir un exercice Changer");
  await click("Développé couché Pectoraux");
  await page.getByRole("combobox", { name: "Nombre de séries" }).selectOption("4");
  await click("Ajouter à la séance");
  await page.getByPlaceholder("Ex. Push, Jambes, Full body…").blur();
  await page.waitForFunction(() => document.title || true); // let the autosave request land
  await page.waitForTimeout(300);
  assert.equal(db.templates.length, 1, "template should autosave after first exercise + name");
  assert.equal(db.templates[0].name, "Push");

  await click("Ajouter un exercice");
  await click("Choisir un exercice Changer");
  await click("Élévations latérales Épaules");
  await click("Ajouter à la séance");
  await click("Ajouter un exercice");
  await click("Choisir un exercice Changer");
  await click("Dips Triceps");
  await page.waitForTimeout(200);
  await click("Ajouter à la séance");
  await page.waitForTimeout(300);
  assert.equal(db.templates[0].exercises.length, 3, "all 3 exercises should be persisted");
  await shot("tpl-01-detail-merged-view");

  // Drag-reorder: move the 3rd row (Dips) to the top via its handle.
  const handles = page.locator(".template-drag-handle");
  const rows = page.locator(".template-exercise-row");
  const from = await handles.nth(2).boundingBox();
  const to = await rows.nth(0).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + 4, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  assert.equal(db.templates[0].exercises[0].name, "Dips", "drag should reorder exercises");
  await shot("tpl-02-after-reorder");

  // Back to the list — card should preview exercise names, not just a count.
  await click("Mes séances");
  await shot("tpl-03-list-with-preview");
  const preview = await page.locator(".list-row small").first().innerText();
  assert.match(preview, /Dips/, "list card should preview exercise names");

  // Reopen, rename via the kebab menu, verify title updates without a modal detour.
  await page.getByRole("button", { name: /^Push/ }).click();
  await click("Options de la séance");
  await click("Renommer la séance");
  await page.getByLabel("Nom de la séance", { exact: true }).fill("Push renommé");
  await click("Enregistrer");
  await page.waitForTimeout(300);
  assert.equal(db.templates[0].name, "Push renommé");
  await shot("tpl-04-renamed");

  // "START" CTA should be pinned at the bottom.
  const cta = page.locator(".template-cta-bar .primary");
  await assert.ok((await cta.boundingBox()).y > 700, "CTA should sit near the bottom of the viewport");

  // Delete via the kebab menu.
  await click("Options de la séance");
  await click("Supprimer la séance");
  await click("Supprimer");
  await page.waitForTimeout(300);
  assert.equal(db.templates.length, 0, "template should be deleted");
  await shot("tpl-05-back-to-empty-list");

  assert.deepEqual(errors, []);
  console.log("PASS: create+autosave, drag reorder, list preview, rename via kebab, pinned CTA, delete.");
} catch (error) {
  await shot("tpl-failure");
  console.error((await page.locator("body").innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
