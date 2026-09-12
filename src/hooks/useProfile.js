import { useRef, useState } from "react";
import * as api from "../lib/api";

// Account/profile state: display name, avatar, body metrics, and the two
// UI surfaces that edit them (the profile bottom sheet and the data modal).
export function useProfile({ email }) {
  const [profile, setProfile] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [metrics, setMetrics] = useState({ age: null, weight_kg: null, height_cm: null, daily_steps: null });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showData, setShowData] = useState(false);
  const [dataForm, setDataForm] = useState({ name: "", age: "", weight: "", height: "", steps: "" });
  const [dataFormError, setDataFormError] = useState("");
  const [dataBusy, setDataBusy] = useState(false);
  const fileInputRef = useRef(null);

  function applyProfileFromServer(prof) {
    setProfile((prof && prof.display_name) || (email ? email.split("@")[0] : "Moi"));
    setAvatarUrl((prof && prof.avatar_url) || null);
    setMetrics({
      age: prof && prof.age != null ? prof.age : null,
      weight_kg: prof && prof.weight_kg != null ? Number(prof.weight_kg) : null,
      height_cm: prof && prof.height_cm != null ? Number(prof.height_cm) : null,
      daily_steps: prof && prof.daily_steps != null ? Number(prof.daily_steps) : null,
    });
  }

  const signOut = async () => {
    setShowProfileMenu(false);
    try {
      await api.signOut();
    } catch {
      /* the auth listener still clears the session */
    }
  };

  const openProfileMenu = () => setShowProfileMenu(true);
  const closeProfileMenu = () => setShowProfileMenu(false);

  const openData = () => {
    setDataForm({
      name: profile,
      age: metrics.age != null ? String(metrics.age) : "",
      weight: metrics.weight_kg != null ? String(metrics.weight_kg) : "",
      height: metrics.height_cm != null ? String(metrics.height_cm) : "",
      steps: metrics.daily_steps != null ? String(metrics.daily_steps) : "",
    });
    setDataFormError("");
    setShowData(true);
  };
  const closeData = () => setShowData(false);

  const setDataFormField = (field, value) => {
    setDataForm((f) => ({ ...f, [field]: value }));
    setDataFormError("");
  };

  const saveData = async () => {
    const name = dataForm.name.trim();
    if (!name) {
      setDataFormError("Le nom ne peut pas être vide.");
      return;
    }
    // "" -> null (champ effacé) ; sinon un nombre positif
    const parseNum = (v) => {
      const s = String(v).replace(",", ".").trim();
      if (s === "") return null;
      const n = Number(s);
      return Number.isFinite(n) && n >= 0 ? n : NaN;
    };
    const age = parseNum(dataForm.age);
    const weight = parseNum(dataForm.weight);
    const height = parseNum(dataForm.height);
    const steps = parseNum(dataForm.steps);
    if ([age, weight, height, steps].some((n) => Number.isNaN(n))) {
      setDataFormError("Âge, poids, taille et pas doivent être des nombres positifs.");
      return;
    }
    const ageInt = age == null ? null : Math.round(age);
    const stepsInt = steps == null ? null : Math.round(steps);
    setDataBusy(true);
    try {
      await api.updateProfile({
        display_name: name,
        age: ageInt,
        weight_kg: weight,
        height_cm: height,
        daily_steps: stepsInt,
      });
      setProfile(name);
      setMetrics({ age: ageInt, weight_kg: weight, height_cm: height, daily_steps: stepsInt });
      setShowData(false);
      setShowProfileMenu(false);
    } catch (err) {
      setDataFormError(err.message || "Impossible d'enregistrer.");
    } finally {
      setDataBusy(false);
    }
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const dataUrl = await new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const size = 240;
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          const side = Math.min(img.width, img.height);
          ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = reject;
        img.src = reader.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }).catch(() => null);
    if (!dataUrl) return;
    try {
      await api.updateProfile({ avatar_url: dataUrl });
      setAvatarUrl(dataUrl);
    } catch {
      /* keep the previous avatar on failure */
    }
    setShowProfileMenu(false);
  };

  return {
    profile,
    avatarUrl,
    metrics,
    showProfileMenu,
    showData,
    dataForm,
    dataFormError,
    dataBusy,
    fileInputRef,
    applyProfileFromServer,
    signOut,
    openProfileMenu,
    closeProfileMenu,
    openData,
    closeData,
    setDataFormField,
    saveData,
    triggerAvatarUpload,
    handleAvatarFile,
  };
}
