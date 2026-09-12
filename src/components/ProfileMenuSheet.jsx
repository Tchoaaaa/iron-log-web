import { Pencil, User, ShieldCheck, LogOut } from "lucide-react";
import { C } from "../lib/theme";
import { fmtNum } from "../lib/format";

export default function ProfileMenuSheet({
  email,
  profile,
  avatarUrl,
  metrics,
  isAdmin,
  onClose,
  onOpenData,
  onTriggerAvatarUpload,
  onShowAdmin,
  onSignOut,
}) {
  return (
    <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.bg, borderTop: `1px solid ${C.line}` }}
        className="w-full max-w-md rounded-t-3xl p-4 flex flex-col gap-1"
      >
        <div className="flex items-center gap-2 px-1 pb-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover" />
          ) : (
            <div style={{ background: C.surfaceRaised }} className="w-9 h-9 rounded-full flex items-center justify-center">
              <User size={16} style={{ color: C.steel }} />
            </div>
          )}
          <div>
            <div style={{ fontWeight: 700 }}>{profile}</div>
            <div style={{ color: C.textFaint }} className="text-xs">{email}</div>
          </div>
        </div>

        {(metrics.age != null ||
          metrics.weight_kg != null ||
          metrics.height_cm != null ||
          metrics.daily_steps != null) && (
          <div className="grid grid-cols-2 gap-2 px-1 pt-1 pb-2">
            {[
              { label: "Âge", value: metrics.age != null ? `${metrics.age} ans` : "—" },
              { label: "Poids", value: metrics.weight_kg != null ? `${metrics.weight_kg} kg` : "—" },
              { label: "Taille", value: metrics.height_cm != null ? `${metrics.height_cm} cm` : "—" },
              { label: "Pas / jour", value: metrics.daily_steps != null ? fmtNum(metrics.daily_steps) : "—" },
            ].map((m) => (
              <div key={m.label} style={{ background: C.surface }} className="rounded-xl px-2 py-2 text-center">
                <div style={{ color: C.textFaint }} className="text-[10px] uppercase tracking-wide">{m.label}</div>
                <div className="il-num text-sm" style={{ fontWeight: 700 }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onOpenData}
          style={{ background: C.surface }}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
        >
          <Pencil size={16} style={{ color: C.textDim }} /> Données
        </button>
        <button
          onClick={onTriggerAvatarUpload}
          style={{ background: C.surface }}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
        >
          <User size={16} style={{ color: C.textDim }} /> Changer ma photo
        </button>
        {isAdmin && (
          <button
            onClick={onShowAdmin}
            style={{ background: C.surface }}
            className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
          >
            <ShieldCheck size={16} style={{ color: C.steel }} /> Espace administrateur
          </button>
        )}
        <button
          onClick={onSignOut}
          style={{ background: C.surface }}
          className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
        >
          <LogOut size={16} style={{ color: C.textDim }} /> Se déconnecter
        </button>
        <button
          onClick={onClose}
          style={{ color: C.textFaint }}
          className="text-center text-sm py-2.5 mt-1"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
