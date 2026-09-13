import { useRef, useState } from "react";
import { Camera, LogOut, Pencil, Shield, UserRound } from "lucide-react";
import CameraDrawer from "../components/CameraDrawer";
export default function ProfileScreen({
  profileHook: p,
  email,
  isAdmin,
  onShowAdmin,
}) {
  const [camera, setCamera] = useState(false);
  const fileInput = useRef(null);
  const chooseFile = () => fileInput.current?.click();
  return (
    <section className="flex flex-col gap-6">
      <div>
        <span className="eyebrow">TON ESPACE</span>
        <h1 className="page-title">Profil</h1>
      </div>
      <div className="flex gap-4 items-center">
        <div className="avatar">
          {p.avatarUrl ? (
            <img src={p.avatarUrl} alt="Ta photo de profil" />
          ) : (
            <UserRound size={32} />
          )}
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-semibold truncate">{p.profile}</h2>
          <p className="muted text-sm break-all">{email}</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          className="secondary flex-1"
          onClick={chooseFile}
          disabled={p.avatarBusy}
        >
          Changer la photo
        </button>
        <button
          className="icon-button"
          aria-label="Prendre une photo avec la caméra"
          onClick={() => setCamera(true)}
          disabled={p.avatarBusy}
        >
          <Camera size={20} />
        </button>
      </div>
      <div className="section-heading">
        <h2>Mes informations</h2>
        <button className="text-button" onClick={p.openData}>
          <Pencil size={15} /> Modifier
        </button>
      </div>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-5">
        {[
          ["Âge", p.metrics.age, "ans"],
          ["Poids", p.metrics.weight_kg, "kg"],
          ["Taille", p.metrics.height_cm, "cm"],
          ["Pas moyens / jour", p.metrics.daily_steps, "pas"],
        ].map(([label, value, unit]) => (
          <div key={label}>
            <dt className="muted text-xs mb-1">{label}</dt>
            <dd className="il-num text-xl">
              {value == null ? (
                "À renseigner"
              ) : (
                <>
                  {Number(value).toLocaleString("fr-FR")}{" "}
                  <small className="muted text-xs">{unit}</small>
                </>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="border-section">
        <h2 className="font-semibold mb-4">Préférences de séance</h2>
        <label className="flex items-start justify-between gap-5 cursor-pointer">
          <span>
            <span className="text-sm font-medium block">Repos automatique</span>
            <span className="muted text-xs block mt-1">
              Lancer le minuteur après chaque série validée.
            </span>
          </span>
          <input
            className="toggle"
            type="checkbox"
            role="switch"
            checked={p.autoRest}
            disabled={p.preferenceBusy}
            onChange={(e) => p.saveAutoRest(e.target.checked)}
          />
        </label>
      </div>
      {p.profileError && (
        <p className="error" role="alert">
          {p.profileError}
        </p>
      )}
      {isAdmin && (
        <button className="secondary" onClick={onShowAdmin}>
          <Shield size={17} /> Administration
        </button>
      )}
      <button className="secondary" onClick={p.signOut}>
        <LogOut size={17} /> Se déconnecter
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={p.handleAvatarFile}
      />
      {camera && (
        <CameraDrawer
          onClose={() => setCamera(false)}
          onSave={p.saveAvatar}
          onChooseFile={chooseFile}
          busy={p.avatarBusy}
          saveError={p.profileError}
        />
      )}
    </section>
  );
}
