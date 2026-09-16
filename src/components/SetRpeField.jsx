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
        <option value="" aria-label="Sans RPE">—</option>
        {Array.from({ length: 10 }, (_, i) => (
          <option key={i + 1} value={i + 1} aria-label={`RPE ${i + 1}`}>{i + 1}</option>
        ))}
      </select>
      <ChevronDown className="rpe-chevron" size={14} aria-hidden="true" />
    </div>
  );
}
