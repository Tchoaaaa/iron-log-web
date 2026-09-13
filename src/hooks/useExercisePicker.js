import { useState } from "react";
import { planFromEntry } from "../lib/exercisePlan";
const fresh = () => ({
  kind: "single",
  name: "",
  nameA: "",
  nameB: "",
  count: 3,
  rest: 90,
  restA: 90,
  restB: 90,
  targets: [],
  targetsB: [],
});
export function useExercisePicker({ library }) {
  const [showPicker, setShowPicker] = useState(false);
  const [plan, setPlan] = useState(fresh);
  const [original, setOriginal] = useState(null);
  const open = (entry = null) => {
    const originalEntry = entry?.sets ? entry : null;
    setOriginal(originalEntry);
    setPlan(originalEntry ? planFromEntry(originalEntry) : fresh());
    setShowPicker(true);
  };
  return {
    showPicker,
    plan,
    original,
    library,
    open,
    close: () => setShowPicker(false),
    update: (field, value) =>
      setPlan((p) => ({
        ...p,
        ...(field === "kind" && value !== p.kind
          ? value === "superset"
            ? { restA: p.rest }
            : { rest: p.restA }
          : {}),
        [field]: value,
      })),
  };
}
