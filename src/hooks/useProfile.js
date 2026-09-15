import { useRef, useState } from "react";
import * as api from "../lib/api";
import { validateProfile } from "../lib/profileValidation";
import { readJSON, writeJSON, debounce } from "../lib/storage";
import { cropSquareToDataUrl } from "../lib/imageCrop";

export function useProfile({ email, user }) {
  const [profile, setProfile] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [metrics, setMetrics] = useState({});
  const [autoRest, setAutoRest] = useState(
    user.user_metadata?.auto_rest === true,
  );
  const [restAlerts, setRestAlerts] = useState(user.user_metadata?.rest_alerts !== false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [showData, setShowData] = useState(false);
  const [dataForm, setDataForm] = useState({
    name: "",
    age: "",
    weight: "",
    height: "",
    steps: "",
  });
  const [dataFormError, setDataFormError] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [preferenceBusy, setPreferenceBusy] = useState(false);
  const draftKey = `gymapp:onboarding:${user.id}`;
  const debouncedDraftWrite = useRef(debounce((value) => writeJSON(draftKey, value), 400)).current;
  function applyProfileFromServer(prof) {
    const name = prof?.display_name || email?.split("@")[0] || "Moi";
    setProfile(name);
    setAvatarUrl(prof?.avatar_url || null);
    const next = {
      age: prof?.age ?? null,
      weight_kg: prof?.weight_kg ?? null,
      height_cm: prof?.height_cm ?? null,
      daily_steps: prof?.daily_steps ?? null,
    };
    setMetrics(next);
    const missing = Object.values(next).some((v) => v == null);
    setNeedsOnboarding(missing);
    if (missing) setDataForm({ ...formFor(name, next), ...readJSON(draftKey) });
  }
  function formFor(name, m) {
    return {
      name,
      age: m.age ?? "",
      weight: m.weight_kg ?? "",
      height: m.height_cm ?? "",
      steps: m.daily_steps ?? "",
    };
  }
  const openData = () => {
    setDataForm(formFor(profile, metrics));
    setDataFormError("");
    setShowData(true);
  };
  const setDataFormField = (field, value) => {
    setDataForm((f) => {
      const next = { ...f, [field]: value };
      if (needsOnboarding) debouncedDraftWrite(next);
      return next;
    });
    setDataFormError("");
  };
  const saveData = async () => {
    if (dataBusy) return;
    let patch;
    try {
      patch = validateProfile(dataForm);
    } catch (e) {
      setDataFormError(e.message);
      return;
    }
    setDataBusy(true);
    setDataFormError("");
    try {
      const saved = await api.updateProfile(patch);
      setProfile(saved.display_name);
      setMetrics({
        age: saved.age,
        weight_kg: saved.weight_kg,
        height_cm: saved.height_cm,
        daily_steps: saved.daily_steps,
      });
      setShowData(false);
      setNeedsOnboarding(false);
      debouncedDraftWrite.cancel();
      writeJSON(draftKey, null);
    } catch (e) {
      setDataFormError(e.message || "Enregistrement impossible. Réessaie.");
    } finally {
      setDataBusy(false);
    }
  };
  const saveAutoRest = async (value) => {
    if (preferenceBusy) return;
    const previous = autoRest;
    setAutoRest(value);
    setPreferenceBusy(true);
    setProfileError("");
    try {
      await api.updatePreferences({ auto_rest: value });
      setAutoRest(value);
    } catch {
      setAutoRest(previous);
      setProfileError("La préférence n’a pas été enregistrée. Réessaie.");
    } finally {
      setPreferenceBusy(false);
    }
  };
  const saveRestAlerts = async (value) => {
    if (preferenceBusy) return;
    const previous = restAlerts;
    setRestAlerts(value);
    setPreferenceBusy(true);
    setProfileError("");
    try {
      await api.updatePreferences({ rest_alerts: value });
    } catch {
      setRestAlerts(previous);
      setProfileError("La préférence n’a pas été enregistrée. Réessaie.");
    } finally {
      setPreferenceBusy(false);
    }
  };
  const signOut = async () => {
    setProfileError("");
    try {
      await api.signOut();
    } catch {
      setProfileError("Déconnexion impossible. Réessaie.");
    }
  };
  const saveAvatar = async (dataUrl) => {
    setAvatarBusy(true);
    setProfileError("");
    try {
      await api.updateProfile({ avatar_url: dataUrl });
      setAvatarUrl(dataUrl);
      return true;
    } catch {
      setProfileError("La photo n’a pas été enregistrée. Réessaie.");
      return false;
    } finally {
      setAvatarBusy(false);
    }
  };
  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setProfileError("Choisis une image de moins de 10 Mo.");
      return;
    }
    setAvatarBusy(true);
    setProfileError("");
    const url = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.src = url;
      await image.decode();
      await saveAvatar(cropSquareToDataUrl(image, { width: image.width, height: image.height }));
    } catch {
      setProfileError(
        "Cette image est illisible. Essaie un fichier JPEG ou PNG.",
      );
    } finally {
      URL.revokeObjectURL(url);
      setAvatarBusy(false);
    }
  };
  return {
    profile,
    avatarUrl,
    metrics,
    autoRest,
    restAlerts,
    needsOnboarding,
    showData,
    dataForm,
    dataFormError,
    dataBusy,
    profileError,
    avatarBusy,
    preferenceBusy,
    applyProfileFromServer,
    openData,
    closeData: () => {
      if (!dataBusy) setShowData(false);
    },
    setDataFormField,
    saveData,
    saveAutoRest,
    saveRestAlerts,
    signOut,
    saveAvatar,
    handleAvatarFile,
  };
}
