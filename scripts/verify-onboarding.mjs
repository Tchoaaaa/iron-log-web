// Local browser check for the onboarding fix from the 2026-09-14 UX audit
// (P2: onboarding blocked access before any first-use value). Supabase
// traffic is intercepted; no real users or data are touched.
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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
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
// A fresh profile: no age/weight/height/steps yet, so needsOnboarding is true.
const db = { profile: { id: user.id, display_name: null, age: null, weight_kg: null, height_cm: null, daily_steps: null } };
await context.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const body = req.postDataJSON();
  const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/auth/v1/user") return json(user);
  if (url.pathname === "/auth/v1/logout") return route.fulfill({ status: 204 });
  if (url.pathname === "/auth/v1/token") return json(session);
  if (url.pathname === "/rest/v1/profiles") {
    if (method === "PATCH") {
      Object.assign(db.profile, body);
      return json(db.profile);
    }
    return json([db.profile]);
  }
  if (url.pathname === "/rest/v1/admins") return json([]);
  if (url.pathname === "/rest/v1/exercises") return json([]);
  if (url.pathname === "/rest/v1/templates") return json([]);
  if (url.pathname === "/rest/v1/workouts") return json([]);
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
  await page.getByText("Posons les bases.").waitFor({ state: "visible" });
  await shot("onboarding-01-optional-fields");
  // Only the name — every metric field is left empty.
  await page.getByLabel("Prénom ou pseudo", { exact: true }).fill("Adam");
  await page.getByRole("button", { name: "C’est parti", exact: true }).click();
  await page.getByText("Bonjour, Adam.").waitFor({ state: "visible" });
  assert.equal(db.profile.age, null);
  assert.equal(db.profile.weight_kg, null);
  assert.equal(db.profile.height_cm, null);
  assert.equal(db.profile.daily_steps, null);
  assert.equal(db.profile.display_name, "Adam");

  assert.deepEqual(errors, []);
  console.log("PASS: onboarding completes with only a name, every body metric stays optional.");
} catch (error) {
  await shot("onboarding-failure");
  console.error((await page.locator("body").innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
