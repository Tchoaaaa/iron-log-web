import { useEffect, useRef, useState } from "react";
import Drawer from "./Drawer";
import { cropSquareToDataUrl } from "../lib/imageCrop";
export default function CameraDrawer({
  onClose,
  onSave,
  onChooseFile,
  busy,
  saveError,
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const alive = useRef(true);
  const [state, setState] = useState("consent");
  const [error, setError] = useState("");
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);
  const start = async () => {
    setError("");
    setState("loading");
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("unsupported");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      if (!alive.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setState("ready");
    } catch (e) {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (!alive.current) return;
      setState("consent");
      setError(
        e.name === "NotAllowedError"
          ? "Accès refusé. Tu peux autoriser la caméra dans les réglages du navigateur ou choisir une photo existante."
          : "Caméra indisponible. Choisis une photo existante ou réessaie.",
      );
    }
  };
  const capture = async () => {
    const video = videoRef.current;
    if (!video.videoWidth) return;
    const dataUrl = cropSquareToDataUrl(video, { width: video.videoWidth, height: video.videoHeight });
    if (await onSave(dataUrl)) onClose();
  };
  return (
    <Drawer title="Photo de profil" onClose={onClose} busy={busy}>
      <div className="flex flex-col gap-4">
        <p className="muted text-sm">
          La caméra sert uniquement à prendre ta photo de profil. Aucun son
          n’est capturé. Seule la photo que tu choisis d’enregistrer est envoyée
          et associée à ton compte.
        </p>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full rounded-2xl ${state === "ready" ? "" : "hidden"}`}
          aria-label="Aperçu de la caméra"
        />
        {state === "ready" ? (
          <button className="primary" onClick={capture} disabled={busy}>
            {busy ? "Enregistrement…" : "Prendre et enregistrer la photo"}
          </button>
        ) : (
          <button
            className="primary"
            onClick={start}
            disabled={state === "loading"}
          >
            {state === "loading"
              ? "En attente de la caméra…"
              : "J’accepte et j’active la caméra"}
          </button>
        )}
        <button
          className="secondary"
          disabled={busy}
          onClick={() => {
            onChooseFile();
            onClose();
          }}
        >
          Choisir une photo existante
        </button>
        {(error || saveError) && (
          <p role="alert" className="error">
            {error || saveError}
          </p>
        )}
      </div>
    </Drawer>
  );
}
