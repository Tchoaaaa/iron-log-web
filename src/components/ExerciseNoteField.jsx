import { useState } from "react";
import { C } from "../lib/theme";

// Personal note under an exercise during a workout. Collapsed by default —
// a single line you tap to reveal the editor. `onType` keeps it in memory as
// you type; `onCommit` (on blur) persists it.
export default function ExerciseNoteField({ label, value, onType, onCommit }) {
  const [open, setOpen] = useState(false);
  const has = !!(value && value.trim());
  if (open) {
    return (
      <textarea
        autoFocus
        rows={2}
        className="il-input rounded-lg px-2.5 py-2 text-[13px] w-full mt-3.5"
        style={{ resize: "none" }}
        placeholder={label ? `Note — ${label}` : "Réglages, ressenti, remarque…"}
        value={value}
        onChange={(e) => onType(e.target.value)}
        onBlur={(e) => {
          onCommit(e.target.value);
          setOpen(false);
        }}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="text-left w-full min-w-0 mt-3.5 text-[11px]"
      style={{ color: has ? C.textDim : C.textFaint, letterSpacing: "0.06em" }}
    >
      {has ? (
        <span className="whitespace-pre-wrap break-words">{value}</span>
      ) : (
        <span className="uppercase">+ Note</span>
      )}
    </button>
  );
}
