import { C } from "../lib/theme";

export default function DataEditModal({ dataForm, dataFormError, dataBusy, onFieldChange, onCancel, onSave }) {
  return (
    <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, borderTop: `1px solid ${C.line}` }}
        className="w-full max-w-md rounded-t-3xl p-4 flex flex-col gap-3"
      >
        <div style={{ fontWeight: 700 }}>Mes données</div>

        <label className="flex flex-col gap-1">
          <span style={{ color: C.textFaint }} className="text-xs">Nom</span>
          <input
            autoFocus
            className="il-input rounded-xl px-3 py-2 text-sm"
            placeholder="Prénom"
            value={dataForm.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span style={{ color: C.textFaint }} className="text-xs">Âge</span>
            <input
              inputMode="numeric"
              className="il-input il-num rounded-xl px-3 py-2 text-sm"
              placeholder="ans"
              value={dataForm.age}
              onChange={(e) => onFieldChange("age", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: C.textFaint }} className="text-xs">Poids</span>
            <input
              inputMode="decimal"
              className="il-input il-num rounded-xl px-3 py-2 text-sm"
              placeholder="kg"
              value={dataForm.weight}
              onChange={(e) => onFieldChange("weight", e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: C.textFaint }} className="text-xs">Taille</span>
            <input
              inputMode="decimal"
              className="il-input il-num rounded-xl px-3 py-2 text-sm"
              placeholder="cm"
              value={dataForm.height}
              onChange={(e) => onFieldChange("height", e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span style={{ color: C.textFaint }} className="text-xs">Pas moyen par jour</span>
          <input
            inputMode="numeric"
            className="il-input il-num rounded-xl px-3 py-2 text-sm"
            placeholder="ex. 8000"
            value={dataForm.steps}
            onChange={(e) => onFieldChange("steps", e.target.value)}
          />
        </label>

        {dataFormError && <div style={{ color: C.rust }} className="text-xs">{dataFormError}</div>}
        <div className="flex gap-2">
          <button onClick={onCancel} style={{ color: C.textDim, border: `1px solid ${C.line}` }} className="flex-1 py-2.5 rounded-full text-sm">
            Annuler
          </button>
          <button
            onClick={onSave}
            disabled={dataBusy}
            style={{ background: C.amber, color: C.signalInk, opacity: dataBusy ? 0.6 : 1 }}
            className="flex-1 py-2.5 rounded-full text-sm font-semibold"
          >
            {dataBusy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
