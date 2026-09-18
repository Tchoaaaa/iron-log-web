import { normalizeRpe } from "../lib/rpe";
import { ChevronDown } from "lucide-react";

export default function SetRpeField({ label, value, onChange }) {
  return (
    <div className="relative min-w-0">
      <select
        className="il-input rpe-select"
        aria-label={label}
        value={normalizeRpe(value) ?? ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" aria-label="No RPE">—</option>
        {Array.from({ length: 5 }, (_, i) => i + 6).map((n) => (
          <option key={n} value={n} aria-label={`RPE ${n}`}>{`SUB ${n}`}</option>
        ))}
      </select>
      <ChevronDown className="rpe-chevron" size={14} aria-hidden="true" />
    </div>
  );
}
