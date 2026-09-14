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
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "dark",
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
const session = { access_token: token, refresh_token: "local-test", token_type: "bearer", expires_in: 3600, expires_at: exp, user };
const db = {
  profile: { id: user.id, display_name: "Adam", age: 28, weight_kg: 75, height_cm: 178, daily_steps: 8000 },
  templates: [{ id: "tpl-1", name: "Push", exercises: [
    { name: "Développé couché", sets: 4, targets: [8,8,10,10], rest: 90 },
    { name: "Élévations latérales", sets: 3, targets: [12,12,15], rest: 60 },
    { name: "Dips", sets: 3, targets: [8,10,12], rest: 90 },
  ]}],
  workouts: [
    { id: "w1", performed_at: "2026-09-12T10:00:00Z", name: "Push", duration_min: 48, exercises: [
      { name: "Développé couché", sets: [{ weight: 85, reps: 8 }, { weight: 80, reps: 10 }] },
      { name: "Squat", sets: [{ weight: 110, reps: 5 }] },
    ] },
  ],
  calls: [],
};
await context.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (url.pathname === "/auth/v1/token") return json(session);
  if (url.pathname === "/rest/v1/profiles") return json([db.profile]);
  if (url.pathname === "/rest/v1/admins") return json([]);
  if (url.pathname === "/rest/v1/exercises")
    return json([
      { name: "Développé couché", category: "Pectoraux" },
      { name: "Élévations latérales", category: "Épaules" },
      { name: "Dips", category: "Triceps" },
      { name: "Squat", category: "Quadriceps" },
    ]);
  if (url.pathname === "/rest/v1/templates") {
    if (method === "PATCH") { const row = db.templates[0]; return json(row); }
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
const shot = (name) => page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: "disabled" });
const click = (name) => page.getByRole("button", { name, exact: true }).click();
page.setDefaultTimeout(10000);

await page.goto(base);
await shot("dark-01-home");
await click("Séances");
await shot("dark-02-templates-list");
await page.getByRole("button", { name: /^Push/ }).click();
await shot("dark-03-template-detail");
await click("Mes séances");
await click("Accueil");
await click("Performance");
await shot("dark-04-performance");
await page.getByRole("button", { name: "Records" }).click();
await page.getByRole("button", { name: /Développé couché/ }).click();
await shot("dark-05-exercise-detail");
await browser.close();
console.log("done");
