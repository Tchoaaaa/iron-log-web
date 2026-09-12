import { ShieldCheck } from "lucide-react";
import { C } from "../lib/theme";

export default function AppHeader({ isAdmin, onShowAdmin, avatarUrl, onOpenProfileMenu }) {
  return (
    <div
      className="flex items-center justify-between px-4 pb-3 flex-shrink-0"
      style={{
        borderBottom: `1px solid ${C.line}`,
        paddingTop: "max(1rem, env(safe-area-inset-top))",
        background: C.bg,
        position: "sticky",
        top: 0,
        zIndex: 30,
      }}
    >
      <div className="flex items-center">
        <span className="il-brand text-base" style={{ fontWeight: 600 }}>
          <span style={{ color: C.amber }}>Ø</span>RE
        </span>
      </div>
      <div className="flex items-center gap-3">
        {isAdmin && (
          <button
            onClick={onShowAdmin}
            style={{ color: C.amber }}
            className="flex items-center gap-1 text-xs"
            title="Espace administrateur"
          >
            <ShieldCheck size={13} /> Admin
          </button>
        )}
        <button
          onClick={onOpenProfileMenu}
          className="flex items-center justify-center w-8 h-8 -mr-1"
          aria-label="Profil"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex items-center justify-center"
              style={{
                width: 15,
                height: 15,
                borderRadius: "50%",
                border: `1.5px solid ${C.textDim}`,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: C.amber,
                  display: "block",
                }}
              />
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
