// Local browser check for the "Mot de passe oublié ?" flow added from the
// 2026-09-14 UX audit (P1: no accessible password recovery). Supabase
// traffic is intercepted; no real email is sent.
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
const calls = [];
await context.route(`${apiUrl}/**`, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const body = req.postDataJSON();
  calls.push({ path: url.pathname, body });
  const json = (data, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  if (url.pathname === "/auth/v1/recover") return json({});
  return json({ message: `Unexpected mocked endpoint ${url.pathname}` }, 400);
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
const shot = (name) => page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: "disabled" });
page.setDefaultTimeout(10000);

try {
  await page.goto(base);
  await assert.ok(await page.getByText("Connecte-toi pour continuer").isVisible(), "should land on the sign-in screen");
  await page.getByRole("button", { name: "Mot de passe oublié ?", exact: true }).click();
  await shot("reset-01-form");
  await page.getByLabel("Adresse e-mail", { exact: true }).fill("test@example.invalid");
  await page.getByRole("button", { name: "Envoyer le lien", exact: true }).click();
  await page.getByText("Vérifie ta boîte mail").waitFor({ state: "visible" });
  await shot("reset-02-sent");
  const recoverCall = calls.find((c) => c.path === "/auth/v1/recover");
  assert.ok(recoverCall, "should have called Supabase's password recovery endpoint");
  assert.equal(recoverCall.body.email, "test@example.invalid");
  await page.getByRole("button", { name: "Retour à la connexion", exact: true }).click();
  await page.getByText("Connecte-toi pour continuer").waitFor({ state: "visible" });

  assert.deepEqual(errors, []);
  console.log("PASS: forgot-password link, request form, confirmation, and return to sign-in all work.");
} catch (error) {
  await shot("reset-failure");
  console.error((await page.locator("body").innerText()).slice(0, 6000));
  throw error;
} finally {
  await browser.close();
}
