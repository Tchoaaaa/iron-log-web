import { useState } from "react";
import { ArrowLeft, Search, Plus } from "lucide-react";
import Drawer from "./Drawer";
import { REST_OPTIONS } from "../lib/constants";
import { formatRest } from "../lib/format";
import { hasSetRpe } from "../lib/rpe";

// Accent-insensitive search — "developpe" should find "Développé couché".
const foldAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function ExercisePickerModal({
  picker,
  onFinish,
  onCreateExercise,
}) {
  const { plan, original, library, update, close } = picker;
  const [choosing, setChoosing] = useState(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const superSet = plan.kind === "superset";
  const filtered = library.filter((e) =>
    foldAccents(e.name.toLocaleLowerCase("fr")).includes(
      foldAccents(query.toLocaleLowerCase("fr")),
    ),
  );
  const choose = (name) => {
    update(choosing, name);
    if (choosing === "nameA") update("name", name);
    setChoosing(null);
    setQuery("");
    setError("");
  };
  const finish = () => {
    if (!plan.nameA || (superSet && !plan.nameB))
      return setError("Choisis chaque exercice avant de continuer.");
    if (superSet && plan.nameA === plan.nameB)
      return setError("Choisis deux exercices différents pour le superset.");
    if (!plan.rpeEnabled && hasSetRpe(original))
      return setError("Efface les RPE saisis dans les séries avant de désactiver cette option.");
    const values = [
      ...plan.targets.slice(0, plan.count),
      ...(superSet ? plan.targetsB.slice(0, plan.count) : []),
    ];
    if (
      values.some(
        (v) =>
          v !== "" &&
          v != null &&
          (!Number.isInteger(Number(v)) || Number(v) < 1 || Number(v) > 999),
      )
    )
      return setError(
        "Les répétitions doivent être des entiers entre 1 et 999, ou rester vides.",
      );
    if (
      Array.isArray(original?.sets) &&
      original.sets
        .slice(plan.count)
        .some((s) =>
          Object.entries(s).some(
            ([k, v]) => /^(weight|reps|rpe)/.test(k) && v !== "",
          ),
        )
    )
      return setError(
        "Ces séries contiennent des résultats. Garde leur nombre pour préserver les données.",
      );
    const result = {
      ...plan,
      name: plan.nameA,
      targets: plan.targets.slice(0, plan.count),
      targetsB: plan.targetsB.slice(0, plan.count),
    };
    onFinish(result);
    close();
  };
  const create = async () => {
    setBusy(true);
    setError("");
    try {
      const name = await onCreateExercise(query);
      if (name) choose(name);
      else setError("Impossible de créer cet exercice. Réessaie.");
    } catch (e) {
      setError(e.message || "Création impossible.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Drawer
      title={original ? "Modifier l’exercice" : "Ajouter un exercice"}
      onClose={close}
      busy={busy}
    >
      <div
        className="segmented mb-5"
        role="group"
        aria-label="Mode de l’exercice"
      >
        {["single", "superset"].map((kind) => (
          <button
            key={kind}
            aria-pressed={plan.kind === kind}
            onClick={() => {
              update("kind", kind);
              if (kind === "single" && choosing === "nameB") setChoosing(null);
            }}
          >
            {kind === "single" ? "Normal" : "Superset"}
          </button>
        ))}
      </div>
      {original &&
        (original.pair || original.kind === "superset") &&
        !superSet && (
          <p className="muted text-sm mb-4">
            Les deux exercices seront conservés séparément.
          </p>
        )}
      {choosing ? (
        <div className="flex flex-col gap-3">
          <button
            className="text-button justify-start"
            onClick={() => setChoosing(null)}
          >
            <ArrowLeft size={16} /> Réglages de l’exercice
          </button>
          <p className="text-sm font-semibold">
            {choosing === "nameB" ? "Deuxième exercice" : "Choisir un exercice"}
          </p>
          <label className="relative">
            <Search size={17} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              autoFocus
              aria-label="Rechercher un exercice"
              className="il-input w-full"
              style={{ paddingRight: 40 }}
              placeholder="Rechercher ou créer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1 max-h-72 overflow-auto">
            {filtered.map((e) => (
              <button
                className="exercise-option"
                key={e.name}
                onClick={() => choose(e.name)}
              >
                <span>{e.name}</span>
                <small className="muted">{e.category}</small>
              </button>
            ))}
            {query.trim() &&
              !filtered.some(
                (e) => e.name.toLowerCase() === query.trim().toLowerCase(),
              ) && (
                <button className="secondary" disabled={busy} onClick={create}>
                  <Plus size={16} /> Créer « {query.trim()} »
                </button>
              )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            {(superSet ? ["nameA", "nameB"] : ["nameA"]).map((field, i) => (
              <button
                className="exercise-option"
                key={field}
                onClick={() => setChoosing(field)}
              >
                <span>
                  {superSet ? `${i + 1}. ` : ""}
                  {plan[field] || "Choisir un exercice"}
                </span>
                <small className="muted">Changer</small>
              </button>
            ))}
          </div>
          <label className="field">
            {superSet ? "Nombre de rounds" : "Nombre de séries"}
            <select
              className="il-input"
              value={plan.count}
              onChange={(e) => update("count", Number(e.target.value))}
            >
              {Array.from({ length: Math.max(12, plan.count) }, (_, i) => (
                <option key={i} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
          <div>
            <h3 className="font-semibold text-sm">
              Répétitions prévues{" "}
              <span className="muted font-normal">· facultatif</span>
            </h3>
            <p className="muted text-xs mt-1 mb-3">
              Un objectif pour chaque série. Les résultats se saisissent pendant
              la séance.
            </p>
            {superSet && (
              <div className="grid grid-cols-[44px_1fr_1fr] gap-2 text-xs muted mb-2">
                <span />
                <span>{plan.nameA || "Exercice 1"}</span>
                <span>{plan.nameB || "Exercice 2"}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              {Array.from({ length: plan.count }, (_, i) => (
                <div
                  key={i}
                  className={`grid ${superSet ? "grid-cols-[44px_1fr_1fr]" : "grid-cols-[44px_1fr]"} items-center gap-2`}
                >
                  <span className="il-num muted text-sm">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {(superSet ? ["targets", "targetsB"] : ["targets"]).map(
                    (field) => (
                      <input
                        key={field}
                        className="il-input il-num"
                        type="number"
                        min="1"
                        max="999"
                        step="1"
                        inputMode="numeric"
                        aria-label={`Répétitions série ${i + 1}${superSet ? (field === "targets" ? " exercice 1" : " exercice 2") : ""}`}
                        placeholder="Libre"
                        value={plan[field][i] ?? ""}
                        onChange={(e) => {
                          const next = [...plan[field]];
                          next[i] = e.target.value;
                          update(field, next);
                        }}
                      />
                    ),
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(superSet ? ["restA", "restB"] : ["rest"]).map((field, i) => (
              <label className="field" key={field}>
                {superSet ? `Repos après exercice ${i + 1}` : "Temps de repos"}
                <select
                  className="il-input"
                  value={plan[field]}
                  onChange={(e) => update(field, Number(e.target.value))}
                >
                  {[0, ...REST_OPTIONS].map((s) => (
                    <option key={s} value={s}>
                      {s === 0 ? "Sans repos" : formatRest(s)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="flex items-start gap-3 text-sm cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0"
              checked={!!plan.rpeEnabled}
              onChange={(e) => update("rpeEnabled", e.target.checked)}
            />
            <span>
              <span className="font-semibold">Activer le RPE ressenti pour ce bloc</span>
              <span className="muted block text-xs mt-1">
                Un RPE ressenti facultatif pour chaque série
                {superSet ? " de chaque exercice du superset" : " de ce bloc"}, à saisir pendant la séance.
              </span>
            </span>
          </label>
          <button className="primary" onClick={finish}>
            {original ? "Enregistrer les modifications" : "Ajouter à la séance"}
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="error mt-3">
          {error}
        </p>
      )}
    </Drawer>
  );
}
