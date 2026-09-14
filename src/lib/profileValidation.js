// Only the name is required, at onboarding or later — body metrics are
// nice-to-have context, not a gate to using the app, so they stay optional
// everywhere they're asked for.
export function validateProfile(form) {
  if (!form.name.trim()) throw new Error("Renseigne ton prénom ou ton pseudo.");
  const fields = [
    ["age", "Âge", 1, 120, true],
    ["weight", "Poids", 1, 500, false],
    ["height", "Taille", 30, 260, false],
    ["steps", "Pas quotidiens", 0, 100000, true],
  ];
  const result = { display_name: form.name.trim() };
  const keys = {
    age: "age",
    weight: "weight_kg",
    height: "height_cm",
    steps: "daily_steps",
  };
  for (const [field, label, min, max, integer] of fields) {
    const raw = String(form[field] ?? "")
      .trim()
      .replace(",", ".");
    if (!raw) {
      result[keys[field]] = null;
      continue;
    }
    const value = Number(raw);
    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    )
      throw new Error(
        `${label} : saisis ${integer ? "un entier" : "un nombre"} entre ${min} et ${max}.`,
      );
    result[keys[field]] = value;
  }
  return result;
}
