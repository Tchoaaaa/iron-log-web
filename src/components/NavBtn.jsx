import { C } from "../lib/theme";

// Bottom nav tab button. Takes explicit props instead of closing over the
// parent's `tab`/`setTab` state, so it can be declared outside the app shell
// (a component re-created on every render loses its identity — and any
// local state — each time).
export default function NavBtn({ id, icon: Icon, label, active, onSelect }) {
  return (
    <button
      onClick={() => onSelect(id)}
      style={{ color: active ? C.amber : C.textFaint }}
      className="flex flex-col items-center gap-1 py-2 flex-1"
    >
      <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
      <span className="text-xs" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
    </button>
  );
}
