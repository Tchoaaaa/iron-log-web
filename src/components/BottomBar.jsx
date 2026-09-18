import { useState } from "react";
import Drawer from "./Drawer";
import { Home, ClipboardList, ChartNoAxesCombined, UserRound } from "lucide-react";
import { C } from "../lib/theme";
import { listIncompleteSets } from "../lib/sessionTimer";
import NavBtn from "./NavBtn";

// Fixed to the viewport bottom so it stays put on scroll and zoom.
// Finish/discard while in an active workout, else the tab bar.
export default function BottomBar({ tab, active, templateDraft, finishing, onFinishWorkout, onSelectTab }) {
  const [confirmFinish, setConfirmFinish] = useState(false);
  const incomplete = active ? listIncompleteSets(active.entries) : [];
  const confirmWorkoutFinish = async () => {
    if (finishing) return;
    try {
      await onFinishWorkout();
    } finally {
      setConfirmFinish(false);
    }
  };
  if (tab === "workout" && active) {
    return (
      <>
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
          onClick={active.editId ? onFinishWorkout : () => setConfirmFinish(true)}
          disabled={finishing}
          style={{ background: C.amber, color: C.signalInk, letterSpacing: "0.06em", opacity: finishing ? 0.6 : 1 }}
          className="w-full py-3.5 rounded-full font-semibold text-sm uppercase"
        >
          {finishing ? "…" : active?.editId ? "Save changes" : "Finish workout"}
        </button>
      </div>
      {confirmFinish && (
        <Drawer
          title="Finish workout?"
          onClose={() => setConfirmFinish(false)}
          busy={finishing}
        >
          {incomplete.length > 0 ? (
            <div className="mb-5">
              <p className="text-sm mb-2">
                {incomplete.length} incomplete set
                {incomplete.length > 1 ? "s" : ""} won't be saved:
              </p>
              <ul className="muted text-sm mb-3" style={{ paddingLeft: 18, listStyle: "disc" }}>
                {incomplete.map((row, i) => (
                  <li key={i}>
                    {row.name}, set {row.setIndex}
                  </li>
                ))}
              </ul>
              <p className="muted text-sm">
                Enter a weight and reps to keep them, or finish without them.
              </p>
            </div>
          ) : (
            <p className="muted text-sm mb-5">
              Make sure you've logged all your sets before finishing.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              className="secondary"
              disabled={finishing}
              onClick={() => setConfirmFinish(false)}
            >
              Continue workout
            </button>
            <button
              className="primary"
              disabled={finishing}
              onClick={confirmWorkoutFinish}
            >
              {finishing ? "Saving…" : "Yes, finish workout"}
            </button>
          </div>
        </Drawer>
      )}
      </>
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
      <NavBtn id="home" icon={Home} label="HOME" active={tab === "home"} onSelect={onSelectTab} />
      <NavBtn id="templates" icon={ClipboardList} label="TRAINING" active={tab === "templates"} onSelect={onSelectTab} />
      <NavBtn id="performance" icon={ChartNoAxesCombined} label="RECORDS" active={tab === "performance"} onSelect={onSelectTab} />
      <NavBtn id="profile" icon={UserRound} label="PROFIL" active={tab === "profile"} onSelect={onSelectTab} />
    </div>
  );
}
