import { Home, ClipboardList, History, Trophy } from "lucide-react";
import { C } from "../lib/theme";
import NavBtn from "./NavBtn";

// Fixed to the viewport bottom so it stays put on scroll and zoom.
// Finish/discard while in an active workout, else the tab bar.
export default function BottomBar({ tab, active, templateDraft, finishing, onFinishWorkout, onSelectTab }) {
  if (tab === "workout" && active) {
    return (
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          maxWidth: 430,
          marginLeft: "auto",
          marginRight: "auto",
          borderTop: `1px solid ${C.line}`,
          background: C.bg,
          paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
        }}
        className="p-3"
      >
        <button
          onClick={onFinishWorkout}
          disabled={finishing}
          style={{ background: C.amber, color: C.signalInk, letterSpacing: "0.06em", opacity: finishing ? 0.6 : 1 }}
          className="w-full py-3.5 rounded-full font-semibold text-sm uppercase"
        >
          {finishing ? "…" : active?.editId ? "Enregistrer les modifications" : "Terminer la séance"}
        </button>
      </div>
    );
  }

  if (tab === "templates" && templateDraft) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 40,
        maxWidth: 430,
        marginLeft: "auto",
        marginRight: "auto",
        borderTop: `1px solid ${C.line}`,
        background: C.bg,
        paddingTop: 4,
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
      }}
      className="flex"
    >
      <NavBtn id="home" icon={Home} label="Accueil" active={tab === "home"} onSelect={onSelectTab} />
      <NavBtn id="templates" icon={ClipboardList} label="Séances" active={tab === "templates"} onSelect={onSelectTab} />
      <NavBtn id="history" icon={History} label="Historique" active={tab === "history"} onSelect={onSelectTab} />
      <NavBtn id="pr" icon={Trophy} label="Records" active={tab === "pr"} onSelect={onSelectTab} />
    </div>
  );
}
