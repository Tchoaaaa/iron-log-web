export default function ProfileFields({ form, onChange, disabled }) {
  return (
    <fieldset disabled={disabled} className="grid grid-cols-2 gap-4">
      <label className="field col-span-2">
        Prénom ou pseudo
        <input
          autoComplete="nickname"
          className="il-input"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          maxLength={80}
        />
      </label>
      {[
        ["age", "Âge (ans)", "numeric", "Ex. 28"],
        ["weight", "Poids (kg)", "decimal", "Ex. 75"],
        ["height", "Taille (cm)", "decimal", "Ex. 178"],
        ["steps", "Pas moyens / jour", "numeric", "Ex. 8000"],
      ].map(([key, label, mode, placeholder]) => (
        <label key={key} className="field">
          {label}
          <input
            className="il-input il-num w-full"
            inputMode={mode}
            placeholder={placeholder}
            value={form[key]}
            onChange={(e) => onChange(key, e.target.value)}
          />
        </label>
      ))}
    </fieldset>
  );
}
