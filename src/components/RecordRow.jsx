import { ChevronRight } from "lucide-react";
import { fmtDate, fmtNum } from "../lib/format";

export default function RecordRow({ record, onExercise }) {
  return (
    <button className="record-row" onClick={() => onExercise(record.name)}>
      <strong className="record-name" title={record.name}>{record.name}</strong>
      <span className="record-result">{fmtNum(record.weight)} kg × {record.reps}</span>
      <span className="record-date">{fmtDate(record.date)}</span>
      <ChevronRight size={14} aria-hidden="true" />
    </button>
  );
}
