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
const base = process.env.VERIFY_URL || "http://127.0.0.1:5174";
const output = fileURLToPath(new URL("../verification/", import.meta.url));
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: "chrome" });
const errors = [];
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  colorScheme: "light",
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
const exp = Math.floor(Date.now() / 1000) + 3600;
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
    age: null,
    weight_kg: null,
    height_cm: null,
    daily_steps: null,
  },
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
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(data),
    });
  if (url.pathname === "/auth/v1/user") {
    if (method === "PUT") Object.assign(user.user_metadata, body.data);
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
      const saved = { id: "workout-1", ...body };
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
  page.screenshot({ path: `${output}${name}.png`, fullPage: true, animations: "disabled" });
const expectVisible = async (locator) => {
  await locator.waitFor({ state: "visible", timeout: 10000 });
};
const click = (name) => page.getByRole("button", { name, exact: true }).click();
try {
  await page.goto(base);
  await expectVisible(page.getByRole("heading", { name: "Posons les bases." }));
  console.log("PASS: dev server renders onboarding with no Vite overlay");
  await shot("01-onboarding");
  await page.getByLabel("Âge (ans)", { exact: true }).fill("28");
  await page.getByLabel("Poids (kg)", { exact: true }).fill("75,5");
  await page.getByLabel("Taille (cm)", { exact: true }).fill("178");
  await page.getByLabel("Pas moyens / jour", { exact: true }).fill("8000");
  await click("C’est parti");
  await expectVisible(page.getByRole("heading", { name: "Bonjour, Adam." }));
  assert.equal(db.profile.weight_kg, 75.5);
  await shot("02-home-light");
  assert.equal(await page.locator("header").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  console.log("PASS: onboarding submits profile, homepage and no topbar");
  await click("Profil");
  await page.getByRole("switch").check();
  await page.waitForFunction(
    () => !document.querySelector("[role=switch]").disabled,
  );
  assert.equal(user.user_metadata.auto_rest, true);
  await shot("03-profile-light");
  await page.reload();
  await click("Profil");
  assert.equal(await page.getByRole("switch").isChecked(), true);
  await click("Prendre une photo avec la caméra");
  await expectVisible(page.getByText("J’accepte et j’active la caméra"));
  assert.equal(await page.locator("video").evaluate((v) => v.srcObject), null);
  await click("J’accepte et j’active la caméra");
  await expectVisible(page.getByRole("alert"));
  await page.keyboard.press("Escape");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  console.log(
    "PASS: rest preference persists; camera requests permission only after consent; refusal handled",
  );
  await click("Suivi");
  await expectVisible(
    page.getByRole("button", { name: "Démarrer une séance", exact: true }),
  );
  await click("Séances");
  await click("Créer ma première séance");
  await page.getByLabel("Nom de la séance", { exact: true }).fill("Push test");
  await click("Ajouter un exercice");
  await expectVisible(page.getByRole("combobox", { name: /Nombre de séries/ }));
  assert.equal(await page.getByLabel("Rechercher un exercice", { exact: true }).count(), 0);
  await click("Superset");
  await click("Normal");
  assert.equal(
    await page
      .getByRole("button", { name: "Normal", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByLabel("Répétitions série 1", { exact: true }).fill("10");
  await click("Choisir un exercice Changer");
  await page.getByRole("button", { name: "Squat Jambes" }).click();
  assert.equal(await page.getByLabel("Répétitions série 1", { exact: true }).inputValue(), "10");
  await page.getByLabel("Répétitions série 1", { exact: true }).fill("10");
  await page.getByLabel("Répétitions série 2", { exact: true }).fill("8");
  await page.getByLabel("Répétitions série 3", { exact: true }).fill("6");
  await shot("04-exercise-drawer");
  await click("Ajouter à la séance");
  await click("Modifier Squat");
  await page.getByLabel("Répétitions série 1", { exact: true }).fill("99");
  await page.keyboard.press("Escape");
  await click("Modifier Squat");
  assert.equal(
    await page.getByLabel("Répétitions série 1", { exact: true }).inputValue(),
    "10",
  );
  await click("Superset");
  await page.getByRole("button", { name: /2\. Choisir un exercice/ }).click();
  await page.getByRole("button", { name: "Row Dos" }).click();
  await page
    .getByLabel("Répétitions série 1 exercice 2", { exact: true })
    .fill("8");
  await click("Enregistrer les modifications");
  await click("Enregistrer la séance");
  assert.deepEqual(db.templates[0].exercises[0].targets, ["10", "8", "6"]);
  console.log(
    "PASS: reversible modes, per-set targets, canceled drawer edits do not mutate template",
  );
  await page.getByRole("button", { name: "Push test 1 exercices" }).click();
  await click("Démarrer cette séance");
  await expectVisible(page.getByRole("heading", { name: "Push test" }));
  await page
    .getByLabel("Squat, série 1, charge en kg", { exact: true })
    .fill("80");
  await page
    .getByLabel("Squat, série 1, répétitions réalisées", { exact: true })
    .fill("10");
  await click("Valider Squat, série 1");
  await expectVisible(page.getByText("TEMPS DE REPOS", { exact: true }));
  await click("Mettre le chronomètre en pause");
  const paused = await page
    .getByRole("timer", { name: "Durée de la séance" })
    .innerText();
  await click("Retour à l’accueil");
  await click("Reprendre ma séance");
  assert.equal(
    await page.getByRole("timer", { name: "Durée de la séance" }).innerText(),
    paused,
  );
  await page.reload();
  await click("Reprendre ma séance");
  assert.equal(
    await page
      .getByLabel("Squat, série 1, charge en kg", { exact: true })
      .inputValue(),
    "80",
  );
  await click("Reprendre le chronomètre");
  await page
    .getByLabel("Row, série 1, charge en kg", { exact: true })
    .fill("45");
  await page
    .getByLabel("Row, série 1, répétitions réalisées", { exact: true })
    .fill("8");
  await click("Modifier Squat + Row");
  await click("Normal");
  await click("Enregistrer les modifications");
  assert.equal(
    await page
      .getByLabel("Row, série 1, charge en kg", { exact: true })
      .inputValue(),
    "45",
  );
  await shot("05-workout-light");
  console.log(
    "PASS: automatic rest, pause/reload recovery, dissociated superset preserves both results",
  );
  await click("Terminer la séance");
  await expectVisible(page.getByRole("dialog", { name: "Terminer la séance ?" }));
  assert.equal(db.workouts.length, 0, "Opening confirmation must not save or exit");
  await click("Continuer la séance");
  assert.equal(await page.locator("dialog[open]").count(), 0);
  assert.equal(await page.getByLabel("Squat, série 1, charge en kg", { exact: true }).inputValue(), "80");
  await click("Terminer la séance");
  await page.keyboard.press("Escape");
  assert.equal(db.workouts.length, 0, "Dismissing confirmation must preserve the session");
  await click("Terminer la séance");
  await click("Oui, terminer la séance");
  await expectVisible(page.getByText("SÉANCE TERMINÉE", { exact: false }));
  console.log("PASS: finishing requires confirmation; continue and Escape preserve the session");
  assert.equal(db.workouts[0].exercises.length, 2);
  assert.equal(db.workouts[0].exercises[1].sets[0].weight, 45);
  await page
    .getByRole("button")
    .filter({ hasText: /Continuer|Terminé|Fermer|historique/i })
    .last()
    .click();
  await expectVisible(
    page.getByRole("heading", { name: "Suivi", exact: true }),
  );
  await click("Filtres");
  await page.getByLabel("Du", { exact: true }).fill("2027-01-01");
  await click("Appliquer les filtres");
  await expectVisible(
    page.getByRole("heading", { name: "Aucune séance sur cette sélection." }),
  );
  await click("Effacer les filtres");
  await page.getByRole("button", { name: /Push test/ }).click();
  await expectVisible(page.getByText("SÉANCE ENREGISTRÉE", { exact: true }));
  await shot("06-history-detail");
  await click("Retour");
  await click("Performances");
  await page.getByLabel("Exercice à analyser").selectOption("Squat");
  await shot("07-performance");
  console.log(
    "PASS: workout saved with expected payload, history empty filters, dedicated detail and performance",
  );
  await click("Accueil");
  await page.emulateMedia({ colorScheme: "dark" });
  await shot("08-home-dark");
  await page.setViewportSize({ width: 320, height: 740 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await shot("09-small-screen");
  assert.deepEqual(errors, []);
  console.log(
    "PASS: light/dark mobile layout, no horizontal overflow, no browser errors",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ colorScheme: "light" });
  await click("Profil");
  await page.getByRole("switch").uncheck();
  await page.waitForFunction(
    () => !document.querySelector("[role=switch]").disabled,
  );
  await page
    .locator("input[type=file]")
    .setInputFiles(`${output}02-home-light.png`);
  await page.waitForFunction(() =>
    document.querySelector(".avatar img")?.src.startsWith("data:image/jpeg"),
  );
  assert(db.profile.avatar_url.startsWith("data:image/jpeg"));
  await click("Accueil");
  await click("Démarrer une séance");
  await click("Ajouter un exercice");
  await expectVisible(page.getByRole("combobox", { name: /Nombre de séries/ }));
  assert.equal(await page.getByLabel("Rechercher un exercice", { exact: true }).count(), 0);
  await page.getByLabel("Répétitions série 1", { exact: true }).fill("10");
  await click("Choisir un exercice Changer");
  await page.getByRole("button", { name: "Squat Jambes" }).click();
  assert.equal(await page.getByLabel("Répétitions série 1", { exact: true }).inputValue(), "10");
  await click("Ajouter à la séance");
  await page
    .getByLabel("Squat, série 1, charge en kg", { exact: true })
    .fill("20");
  await page
    .getByLabel("Squat, série 1, répétitions réalisées", { exact: true })
    .fill("10");
  await click("Valider Squat, série 1");
  assert.equal(
    await page.getByText("TEMPS DE REPOS", { exact: true }).count(),
    0,
  );
  await click("Démarrer");
  await expectVisible(page.getByText("TEMPS DE REPOS", { exact: true }));
  await click("Retour à l’accueil");
  await click("Choisir une séance enregistrée");
  await page.getByRole("button", { name: "Push test 1 exercices" }).click();
  await click("Démarrer cette séance");
  await expectVisible(
    page.getByRole("heading", { name: "Une séance est déjà ouverte" }),
  );
  await page.keyboard.press("Escape");
  await click("Profil");
  await click("Se déconnecter");
  await page.getByRole("button", { name: /Pas encore de compte/ }).click();
  await page
    .getByLabel("Adresse e-mail", { exact: true })
    .fill("test@example.invalid");
  await page
    .getByLabel("Mot de passe", { exact: true })
    .fill("Test-local-1234");
  await click("Créer mon compte");
  await expectVisible(
    page.getByRole("heading", { name: "Vérifie ta boîte mail" }),
  );
  assert.equal(
    await page.getByRole("button", { name: /Renvoyer dans/ }).isDisabled(),
    true,
  );
  assert(db.calls.some((c) => c.path === "/auth/v1/signup"));
  await shot("10-email-confirmation");
  await page.clock.install();
  await page.clock.fastForward(61000);
  await click("Renvoyer le lien");
  await expectVisible(
    page.getByText("Un nouveau lien a été demandé.", { exact: false }),
  );
  assert(db.calls.some((c) => c.path === "/auth/v1/resend"));
  assert.deepEqual(errors, []);
  console.log(
    "PASS: avatar upload, automatic rest OFF/manual ON, active-session overwrite guard, signup confirmation and resend cooldown",
  );
} catch (error) {
  await shot("failure");
  console.error(
    "PAGE:",
    (await page.locator("body").innerText()).slice(0, 5000),
  );
  throw error;
} finally {
  await browser.close();
}
