// RPE is optional for each performed set; enabling it applies to a block.
export function normalizeRpe(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (value === "" || (typeof value === "string" && !value.trim())) return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 10 ? number : null;
}

export function setRpeMetadata(value, field = "rpe") {
  const rpe = normalizeRpe(value);
  return rpe === null ? {} : { [field]: rpe };
}

export function hasSetRpe(entry) {
  return Array.isArray(entry?.sets) && entry.sets.some(s =>
    [s.rpe, s.rpeA, s.rpeB].some(value => normalizeRpe(value) !== null),
  );
}

export function rpeEnabled(entry) {
  return entry?.rpeEnabled === true || hasSetRpe(entry);
}
