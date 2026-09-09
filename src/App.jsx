import { useState, useEffect, useMemo, useRef } from "react";
import { Plus, Check, X, ChevronRight, ChevronDown, Trash2, Dumbbell, History, User, Home, Trophy, Search, Play, Square, ClipboardList, Pencil, Sparkles, Footprints, Droplet, LogOut, ShieldCheck, Clock, MoreHorizontal } from "lucide-react";
import { C } from "./lib/theme";
import * as api from "./lib/api";
import { useAuth } from "./lib/useAuth";
import AuthScreen from "./screens/AuthScreen";
import AdminDashboard from "./screens/AdminDashboard";
import { EXERCISE_LIBRARY } from "./data/exercises";

// Library seeded into a new account (grouped by muscle group). See
// src/data/exercises.js and supabase-exercises.sql for existing accounts.
const DEFAULT_EXERCISES = EXERCISE_LIBRARY;

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300];

// SÉRIE | PRÉCÉDENT | KG | RÉPS | ✓
const SET_GRID = "36px minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) 30px";
function formatRest(seconds) {
  if (!seconds) return "";
  if (seconds < 60) return `${seconds}s`;
  if (seconds % 60 === 0) return `${seconds / 60} min`;
  return `${Math.floor(seconds / 60)}min${seconds % 60}`;
}

const MOTIVATIONAL_QUOTES = [
  "That girl s'entraîne même les jours sans motivation.",
  "Ton corps t'écoute. Parle-lui gentiment, mais sérieusement.",
  "Glow now, rest later.",
  "Une séance de plus, une meilleure version de plus.",
  "La discipline, c'est le nouveau soft girl era.",
  "Tu ne le regretteras jamais après. Jamais.",
  "Pilates princess, mais avec des abdos en béton.",
  "Sois cette fille qui n'annule jamais sa séance.",
  "Ta énergie du matin décide de ta journée.",
  "Petit progrès chaque jour = grande transformation.",
  "Strong is the new soft.",
  "Aujourd'hui, tu t'entraînes pour la toi de demain.",
  "Moins de excuses, plus de séries.",
  "Ton mat t'attend. Lui, il ne juge pas.",
  "Une fille qui s'entraîne est une fille qui s'aime.",
  "Consistency > perfection, toujours.",
  "Le confort ne construit rien. Bouge.",
  "Ce n'est pas une punition, c'est un rendez-vous avec toi-même.",
  "Chaque rep te rapproche de la meilleure toi.",
  "Ton futur toi te remercie déjà.",
  "Soft life, strong body.",
  "On n'a pas de mauvais jours, juste des séances plus courtes.",
  "La routine, c'est le nouveau glow up.",
  "Fais-le pour la fille dans le miroir de demain.",
  "Motivation is temporary, discipline is forever.",
  "Ton corps peut. C'est ton mental qu'il faut convaincre.",
  "Une bonne séance vaut mieux qu'un bon café (presque).",
  "Reste douce avec toi, mais ne saute pas ta séance.",
];

function dailyQuote() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);
  return MOTIVATIONAL_QUOTES[dayOfYear % MOTIVATIONAL_QUOTES.length];
}

function estOneRM(weight, reps) {
  if (!weight || !reps) return 0;
  return Math.round(weight * (1 + reps / 30));
}
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}
// "mercredi, 9 sept."
function fmtDayDate(ts) {
  const s = new Date(ts).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "short" });
  return s.replace(/^(\S+)\s/, "$1, ");
}
function fmtDur(mins) {
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h} h ${m > 0 ? m + " min" : ""}`.trim();
}
// live workout chrono: "MM:SS" or "H:MM:SS"
function fmtTimer(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function fmtNum(n) {
  return Number(n).toLocaleString("fr-FR");
}
// Best set of an exercise: heaviest, ties broken by most reps.
function bestSet(sets) {
  if (!sets || sets.length === 0) return null;
  return sets.reduce((best, s) => {
    const w = Number(s.weight) || 0;
    const bw = Number(best.weight) || 0;
    if (w > bw) return s;
    if (w === bw && (Number(s.reps) || 0) > (Number(best.reps) || 0)) return s;
    return best;
  }, sets[0]);
}
function fmtBestSet(s) {
  if (!s) return "—";
  const w = Number(s.weight) || 0;
  const r = Number(s.reps) || 0;
  return w > 0 ? `${fmtNum(w)} kg × ${r}` : `${r} réps`;
}

export default function App() {
  const { session, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh" }} className="w-full flex items-center justify-center">
        <span style={{ color: C.textDim }}>Chargement…</span>
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return <GymApp key={session.user.id} session={session} />;
}

function GymApp({ session }) {
  const email = session.user.email;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [dataError, setDataError] = useState("");
  const [exercises, setExercises] = useState(DEFAULT_EXERCISES);
  const [workouts, setWorkouts] = useState([]); // this user's history
  const [tab, setTab] = useState("home");
  const [active, setActive] = useState(null); // { startedAt, entries: [{id, name, sets:[{weight,reps,done}]}] }
  const [showPicker, setShowPicker] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [pickerMode, setPickerMode] = useState("workout"); // "workout" | "template"
  const [pickerStep, setPickerStep] = useState("search"); // "search" | "sets" | "rest"
  const [pendingExerciseName, setPendingExerciseName] = useState(null);
  const [pendingKind, setPendingKind] = useState("single"); // "single" | "superset"
  const [pendingNameA, setPendingNameA] = useState(null);
  const [pendingNameB, setPendingNameB] = useState(null);
  const [pendingSetCount, setPendingSetCount] = useState(3);
  const [pendingRestA, setPendingRestA] = useState(null);
  const [supersetStage, setSupersetStage] = useState(null); // null | "a" | "b"
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [historyMenuId, setHistoryMenuId] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [prExercise, setPrExercise] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [templateDraft, setTemplateDraft] = useState(null); // { id?, name, exercises: [name,...] }
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const fileInputRef = useRef(null);

  // initial load — every query is scoped to the signed-in user by RLS
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [prof, ex, wk, tpl, admin] = await Promise.all([
          api.getProfile(),
          api.listExercisesOrSeed(DEFAULT_EXERCISES),
          api.listWorkouts(),
          api.listTemplates(),
          api.checkIsAdmin(),
        ]);
        if (!alive) return;
        setProfile((prof && prof.display_name) || (email ? email.split("@")[0] : "Moi"));
        setAvatarUrl((prof && prof.avatar_url) || null);
        setExercises(ex && ex.length ? ex : DEFAULT_EXERCISES);
        setWorkouts(wk || []);
        setTemplates(tpl || []);
        setIsAdmin(!!admin);
      } catch (err) {
        if (alive) setDataError(err.message || "Erreur de chargement des données.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [email]);

  // live chrono while a workout is running (not while editing a past one)
  const timing = !!active && !active.editId;
  useEffect(() => {
    if (!timing) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [timing]);

  const signOut = async () => {
    setShowProfileMenu(false);
    try {
      await api.signOut();
    } catch {
      /* the auth listener still clears the session */
    }
  };

  const openRename = () => {
    setRenameValue(profile);
    setRenameError("");
    setShowRename(true);
  };

  const confirmRename = async () => {
    const newName = renameValue.trim();
    if (!newName || newName === profile) {
      setShowRename(false);
      return;
    }
    try {
      await api.updateProfile({ display_name: newName });
      setProfile(newName);
      setShowRename(false);
      setShowProfileMenu(false);
    } catch (err) {
      setRenameError(err.message || "Impossible d'enregistrer.");
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

  const startWorkout = () => {
    setActive({ startedAt: Date.now(), entries: [], fromTemplate: null });
    setTab("workout");
  };

  // reopen a saved workout in the workout editor (supersets flatten to
  // single exercises; the original date and duration are kept)
  const startEditWorkout = (w) => {
    setHistoryMenuId(null);
    setExpandedHistory(null);
    setActive({
      startedAt: w.date,
      editId: w.id,
      originalDurationMin: w.durationMin,
      fromTemplate: w.name || null,
      entries: w.exercises.map((e) => ({
        id: uid(),
        kind: "single",
        name: e.name,
        sets: e.sets.map((s) => ({
          weight: s.weight === 0 ? "0" : String(s.weight),
          reps: String(s.reps),
          done: true,
        })),
      })),
    });
    setTab("workout");
  };

  const startFromTemplate = (tpl) => {
    setActive({
      startedAt: Date.now(),
      fromTemplate: tpl.name,
      entries: tpl.exercises.map((ex) =>
        ex.pair
          ? {
              id: uid(),
              kind: "superset",
              name: ex.name,
              nameA: ex.pair[0],
              nameB: ex.pair[1],
              restA: ex.restA,
              restB: ex.restB,
              sets: Array.from({ length: ex.sets || 1 }, () => ({ weightA: "", repsA: "", doneA: false, weightB: "", repsB: "", doneB: false })),
            }
          : {
              id: uid(),
              kind: "single",
              name: ex.name,
              rest: ex.rest,
              sets: Array.from({ length: ex.sets || 1 }, () => ({ weight: "", reps: "", done: false })),
            }
      ),
    });
    setTab("workout");
  };

  const openExercisePicker = (mode) => {
    setPickerMode(mode);
    setPickerStep("search");
    setPendingExerciseName(null);
    setPendingKind("single");
    setPendingNameA(null);
    setPendingNameB(null);
    setPendingSetCount(3);
    setPendingRestA(null);
    setSupersetStage(null);
    setShowPicker(true);
  };

  const closePicker = () => {
    setShowPicker(false);
    setPickerQuery("");
    setPickerStep("search");
    setPendingExerciseName(null);
    setPendingKind("single");
    setPendingNameA(null);
    setPendingNameB(null);
    setPendingSetCount(3);
    setPendingRestA(null);
    setSupersetStage(null);
  };

  const startSupersetBuild = () => {
    setSupersetStage("a");
    setPickerQuery("");
  };
  const cancelSupersetBuild = () => {
    setSupersetStage(null);
    setPendingNameA(null);
    setPickerQuery("");
  };

  // step 1: exercise chosen — either finalize a single pick, advance the superset build, or ask set count
  const chooseExercise = (name) => {
    if (supersetStage === "a") {
      setPendingNameA(name);
      setSupersetStage("b");
      setPickerQuery("");
      return;
    }
    if (supersetStage === "b") {
      setPendingKind("superset");
      setPendingNameB(name);
      setSupersetStage(null);
      setPickerStep("sets");
      return;
    }
    setPendingKind("single");
    setPendingExerciseName(name);
    setPickerStep("sets");
  };

  // step 2: set count chosen — go pick rest time(s) when building a séance, otherwise finalize right away
  const chooseSetCount = (count) => {
    setPendingSetCount(count);
    if (pickerMode === "template") {
      setPickerStep("rest");
    } else {
      finalizeExercise(count, undefined, undefined, undefined);
    }
  };

  // step 3 (séances only): rest time chosen — for a superset, ask for the 2nd exercise's rest next
  const chooseRest = (seconds) => {
    if (pendingKind === "superset" && pickerStep === "rest") {
      setPendingRestA(seconds);
      setPickerStep("rest-b");
      return;
    }
    if (pendingKind === "superset" && pickerStep === "rest-b") {
      finalizeExercise(pendingSetCount, undefined, pendingRestA, seconds);
      return;
    }
    finalizeExercise(pendingSetCount, seconds, undefined, undefined);
  };

  const finalizeExercise = (count, rest, restA, restB) => {
    if (pendingKind === "superset") {
      const comboName = `${pendingNameA} + ${pendingNameB}`;
      if (pickerMode === "template") {
        setTemplateDraft((d) =>
          d.exercises.some((e) => e.pair && e.pair[0] === pendingNameA && e.pair[1] === pendingNameB)
            ? d
            : { ...d, exercises: [...d.exercises, { name: comboName, sets: count, restA, restB, pair: [pendingNameA, pendingNameB] }] }
        );
      } else {
        setActive((a) => ({
          ...a,
          entries: [
            ...a.entries,
            {
              id: uid(),
              kind: "superset",
              name: comboName,
              nameA: pendingNameA,
              nameB: pendingNameB,
              sets: Array.from({ length: count }, () => ({ weightA: "", repsA: "", doneA: false, weightB: "", repsB: "", doneB: false })),
            },
          ],
        }));
      }
    } else if (pickerMode === "template") {
      setTemplateDraft((d) =>
        d.exercises.some((e) => e.name === pendingExerciseName)
          ? d
          : { ...d, exercises: [...d.exercises, { name: pendingExerciseName, sets: count, rest }] }
      );
    } else {
      setActive((a) => ({
        ...a,
        entries: [
          ...a.entries,
          {
            id: uid(),
            kind: "single",
            name: pendingExerciseName,
            sets: Array.from({ length: count }, () => ({ weight: "", reps: "", done: false })),
          },
        ],
      }));
    }
    closePicker();
  };

  const addCustomExercise = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (!exercises.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setExercises((prev) => [...prev, { name: trimmed, category: "Perso" }]);
      try {
        await api.addExercise({ name: trimmed, category: "Perso" });
      } catch {
        /* keep the local copy; the library still works this session */
      }
    }
    chooseExercise(trimmed);
  };

  // ---------- templates ----------
  const openNewTemplate = () => {
    setTemplateDraft({ name: "", exercises: [] });
  };
  const openEditTemplate = (tpl) => {
    setTemplateDraft({ id: tpl.id, name: tpl.name, exercises: tpl.exercises.map((e) => ({ ...e })) });
  };
  const removeExerciseFromDraft = (name) => {
    setTemplateDraft((d) => ({ ...d, exercises: d.exercises.filter((e) => e.name !== name) }));
  };
  const adjustDraftExerciseSets = (name, delta) => {
    setTemplateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.name === name ? { ...e, sets: Math.max(1, Math.min(8, e.sets + delta)) } : e
      ),
    }));
  };
  const cycleDraftExerciseRest = (name, which) => {
    setTemplateDraft((d) => ({
      ...d,
      exercises: d.exercises.map((e) => {
        if (e.name !== name) return e;
        const field = which === "A" ? "restA" : which === "B" ? "restB" : "rest";
        const current = REST_OPTIONS.indexOf(e[field]);
        const next = REST_OPTIONS[(current + 1) % REST_OPTIONS.length];
        return { ...e, [field]: next };
      }),
    }));
  };
  const cancelTemplateDraft = () => setTemplateDraft(null);
  const saveTemplateDraft = async () => {
    const name = templateDraft.name.trim();
    if (!name || templateDraft.exercises.length === 0) return;
    try {
      const saved = await api.saveTemplate({
        id: templateDraft.id,
        name,
        exercises: templateDraft.exercises,
      });
      setTemplates((prev) =>
        templateDraft.id ? prev.map((t) => (t.id === saved.id ? saved : t)) : [...prev, saved]
      );
      setTemplateDraft(null);
    } catch (err) {
      setDataError(err.message || "Impossible d'enregistrer la séance.");
    }
  };
  const deleteTemplate = async (id) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.deleteTemplate(id);
    } catch (err) {
      setDataError(err.message || "Suppression impossible.");
    }
  };

  const updateSet = (entryId, idx, field, value) => {
    setActive((a) => ({
      ...a,
      entries: a.entries.map((e) =>
        e.id !== entryId
          ? e
          : { ...e, sets: e.sets.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
      ),
    }));
  };
  const removeEntry = (entryId) => {
    setActive((a) => ({ ...a, entries: a.entries.filter((e) => e.id !== entryId) }));
  };

  const finishWorkout = async () => {
    if (!active || active.entries.length === 0) {
      setActive(null);
      setTab("home");
      return;
    }
    const durationMin = Math.max(1, Math.round((Date.now() - active.startedAt) / 60000));
    const cleaned = active.entries
      .flatMap((e) => {
        if (e.kind === "superset") {
          const a = {
            name: e.nameA,
            superset: e.id,
            sets: e.sets
              .filter((s) => s.weightA !== "" && s.repsA !== "")
              .map((s) => ({ weight: Number(s.weightA), reps: Number(s.repsA) })),
          };
          const b = {
            name: e.nameB,
            superset: e.id,
            sets: e.sets
              .filter((s) => s.weightB !== "" && s.repsB !== "")
              .map((s) => ({ weight: Number(s.weightB), reps: Number(s.repsB) })),
          };
          return [a, b];
        }
        return [
          {
            name: e.name,
            sets: e.sets
              .filter((s) => s.weight !== "" && s.reps !== "")
              .map((s) => ({ weight: Number(s.weight), reps: Number(s.reps) })),
          },
        ];
      })
      .filter((e) => e.sets.length > 0);

    if (cleaned.length === 0) {
      setActive(null);
      setTab("home");
      return;
    }

    try {
      if (active.editId) {
        const saved = await api.updateWorkout(active.editId, {
          name: active.fromTemplate || null,
          exercises: cleaned,
        });
        setWorkouts((prev) => prev.map((w) => (w.id === active.editId ? saved : w)));
        setActive(null);
        setTab("history");
        return;
      }
      const saved = await api.insertWorkout({
        date: Date.now(),
        durationMin,
        exercises: cleaned,
        name: active.fromTemplate || null,
      });
      setWorkouts((prev) => [saved, ...prev]);
      setActive(null);
      setTab("history");
    } catch (err) {
      setDataError(err.message || "Impossible d'enregistrer la séance.");
    }
  };

  const discardWorkout = () => {
    setActive(null);
    setTab("home");
  };

  const deleteWorkout = async (id) => {
    setWorkouts((prev) => prev.filter((w) => w.id !== id));
    try {
      await api.deleteWorkout(id);
    } catch (err) {
      setDataError(err.message || "Suppression impossible.");
    }
  };

  // ---------- derived: PR data ----------
  const loggedExerciseNames = useMemo(() => {
    const set = new Set();
    workouts.forEach((w) => w.exercises.forEach((e) => set.add(e.name)));
    return Array.from(set).sort();
  }, [workouts]);

  // For each exercise name, the sets logged the last time it was done
  // (workouts is newest-first). Shown as the greyed reference per set in a
  // running workout.
  const lastByExercise = useMemo(() => {
    const map = {};
    for (const w of workouts) {
      for (const e of w.exercises) {
        if (!map[e.name]) map[e.name] = { date: w.date, sets: e.sets };
      }
    }
    return map;
  }, [workouts]);

  // Number of weight PRs each workout set (a PR = heavier top set than any
  // earlier session, or the first weighted time doing that exercise).
  const prCountByWorkoutId = useMemo(() => {
    const byId = {};
    const bestSoFar = {}; // exercise -> heaviest top set in earlier sessions
    for (const w of [...workouts].sort((a, b) => a.date - b.date)) {
      const topThis = {};
      for (const e of w.exercises) {
        const mw = e.sets.reduce((m, s) => Math.max(m, Number(s.weight) || 0), 0);
        topThis[e.name] = Math.max(topThis[e.name] ?? 0, mw);
      }
      let count = 0;
      for (const [name, mw] of Object.entries(topThis)) {
        const prior = bestSoFar[name];
        if (prior === undefined ? mw > 0 : mw > prior) count++;
      }
      byId[w.id] = count;
      for (const [name, mw] of Object.entries(topThis)) {
        bestSoFar[name] = Math.max(bestSoFar[name] ?? 0, mw);
      }
    }
    return byId;
  }, [workouts]);

  const prHistory = useMemo(() => {
    if (!prExercise) return [];
    const rows = [];
    [...workouts]
      .sort((a, b) => a.date - b.date)
      .forEach((w) => {
        w.exercises
          .filter((e) => e.name === prExercise)
          .forEach((e) => {
            const best = e.sets.reduce((m, s) => (s.weight > m.weight ? s : m), e.sets[0]);
            rows.push({ date: w.date, weight: best.weight, reps: best.reps });
          });
      });
    return rows;
  }, [workouts, prExercise]);

  const bestEver = useMemo(() => {
    if (prHistory.length === 0) return null;
    return prHistory.reduce((m, r) => (r.weight > m.weight ? r : m), prHistory[0]);
  }, [prHistory]);

  const filteredLibrary = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => e.name.toLowerCase().includes(q));
  }, [exercises, pickerQuery]);

  const quoteOfTheDay = useMemo(() => dailyQuote(), []);

  // ---------- UI pieces ----------
  const NavBtn = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{ color: tab === id ? C.amber : C.textFaint }}
      className="flex flex-col items-center gap-1 py-2 flex-1"
    >
      <Icon size={20} strokeWidth={tab === id ? 2.4 : 1.8} />
      <span className="text-xs" style={{ fontWeight: tab === id ? 600 : 400 }}>{label}</span>
    </button>
  );

  if (loading) {
    return (
      <div style={{ background: C.bg, minHeight: "100dvh" }} className="w-full flex justify-center">
        <div style={{ color: C.textDim, maxWidth: 430 }} className="w-full flex items-center justify-center">
          Chargement…
        </div>
      </div>
    );
  }

  // ---------- admin space (separate screen; the real gate is server-side
  //            RLS + the admin_* RPCs, which refuse non-admins) ----------
  if (showAdmin && isAdmin) {
    return <AdminDashboard onExit={() => setShowAdmin(false)} />;
  }
  return (
    <div
      style={{ background: C.bg, minHeight: "100dvh" }}
      className="w-full flex justify-center"
    >
      <div
        style={{
          color: C.text,
          fontFamily: "system-ui, -apple-system, sans-serif",
          maxWidth: 430,
          minHeight: "100dvh",
          position: "relative",
        }}
        className="w-full flex flex-col"
      >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,500;1,600&display=swap');
        .il-input { background: ${C.surfaceRaised}; border: 1px solid ${C.line}; color: ${C.text}; }
        .il-input::placeholder { color: ${C.textFaint}; }
        .il-input:focus { outline: none; border-color: ${C.amber}; }
        .il-num { font-variant-numeric: tabular-nums; font-family: "SF Mono", ui-monospace, Menlo, monospace; }
        .il-card { background: ${C.surface}; border: 1px solid ${C.line}; }
        .il-logo { font-family: "Playfair Display", Georgia, "Times New Roman", serif; font-style: italic; }
      `}</style>

      {/* header — sticky to the top so it stays put on scroll/zoom */}
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
        <div className="flex items-center gap-2">
          <Dumbbell size={16} style={{ color: C.amber }} />
          <span className="il-logo text-lg" style={{ fontWeight: 600 }}>GymApp</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <button
              onClick={() => setShowAdmin(true)}
              style={{ color: C.steel }}
              className="flex items-center gap-1 text-xs"
              title="Espace administrateur"
            >
              <ShieldCheck size={14} /> Admin
            </button>
          )}
          <button onClick={() => setShowProfileMenu(true)} style={{ color: C.textDim }} className="flex items-center gap-1.5 text-sm">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <User size={14} />
            )}
            {profile}
          </button>
        </div>
      </div>

      {/* content — the page scrolls; the fixed bottom bar sits on top of the
          reserved bottom padding */}
      <div
        className="flex-1 px-4 py-4"
        style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
      >
        {tab === "home" && (
          <div className="flex flex-col gap-4">
            {dataError && (
              <div
                style={{ background: C.surface, border: `1px solid ${C.rust}`, color: C.rust }}
                className="rounded-2xl p-3 text-xs"
              >
                {dataError}
              </div>
            )}
            <div
              style={{ background: C.surfaceRaised, border: `1px solid ${C.line}` }}
              className="rounded-2xl p-4 flex items-start gap-3"
            >
              <Sparkles size={16} style={{ color: C.steel, marginTop: 3, flexShrink: 0 }} />
              <p className="il-logo text-base leading-snug" style={{ color: C.text, fontWeight: 500 }}>
                {quoteOfTheDay}
              </p>
            </div>

            <div className="il-card rounded-2xl p-5 flex flex-col items-start gap-3">
              <div>
                <div style={{ fontWeight: 700 }} className="text-lg">Prêt à t'entraîner ?</div>
                <div style={{ color: C.textDim }} className="text-sm mt-0.5">
                  {workouts.length > 0
                    ? `Dernière séance : ${fmtDate(workouts[0].date)}`
                    : "Aucune séance enregistrée pour l'instant"}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={startWorkout}
                  style={{ background: C.amber, color: C.text }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold"
                >
                  <Play size={16} fill={C.text} /> Séance vide
                </button>
                <button
                  onClick={() => setTab("templates")}
                  style={{ border: `1px solid ${C.line}`, color: C.text }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold"
                >
                  <ClipboardList size={16} /> Mes séances
                </button>
              </div>
            </div>

            {templates.length > 0 && (
              <div>
                <div style={{ color: C.textDim }} className="text-sm mb-2">Démarrage rapide</div>
                <div className="flex flex-col gap-2">
                  {templates.slice(0, 3).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => startFromTemplate(t)}
                      className="il-card rounded-2xl p-3 flex items-center justify-between text-left"
                    >
                      <div>
                        <div style={{ fontWeight: 600 }} className="text-sm">{t.name}</div>
                        <div style={{ color: C.textFaint }} className="text-xs mt-0.5">
                          {t.exercises.length} exercice{t.exercises.length > 1 ? "s" : ""}
                        </div>
                      </div>
                      <Play size={16} style={{ color: C.amber }} fill={C.amber} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="il-card rounded-2xl p-4">
                <div style={{ color: C.textDim }} className="text-xs mb-1">Séances</div>
                <div className="il-num text-2xl" style={{ fontWeight: 700 }}>{workouts.length}</div>
              </div>
              <div className="il-card rounded-2xl p-4">
                <div style={{ color: C.textDim }} className="text-xs mb-1">Ce mois-ci</div>
                <div className="il-num text-2xl" style={{ fontWeight: 700 }}>
                  {workouts.filter((w) => new Date(w.date).getMonth() === new Date().getMonth() && new Date(w.date).getFullYear() === new Date().getFullYear()).length}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div style={{ background: C.surface, border: `1.5px solid ${C.steel}` }} className="rounded-3xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Footprints size={16} style={{ color: C.steel }} />
                  <span style={{ color: C.textDim, letterSpacing: "0.05em", fontWeight: 700 }} className="text-xs">
                    OBJECTIF DE PAS
                  </span>
                </div>
                <div className="il-num text-3xl" style={{ fontWeight: 800, color: C.steel }}>10 000</div>
                <div style={{ color: C.textFaint }} className="text-xs mt-1">Ça use, ça use !</div>
              </div>
              <div style={{ background: C.surface, border: `1.5px solid ${C.water}` }} className="rounded-3xl p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <Droplet size={16} style={{ color: C.water }} />
                  <span style={{ color: C.textDim, letterSpacing: "0.05em", fontWeight: 700 }} className="text-xs">
                    HYDRATATION
                  </span>
                </div>
                <div className="il-num text-3xl" style={{ fontWeight: 800, color: C.water }}>2-3 L</div>
                <div style={{ color: C.textFaint }} className="text-xs mt-1">GlouGlouGlou</div>
              </div>
            </div>

            {workouts.length > 0 && (
              <div>
                <div style={{ color: C.textDim }} className="text-sm mb-2">Séances récentes</div>
                <div className="flex flex-col gap-2">
                  {workouts.slice(0, 3).map((w) => (
                    <div key={w.id} className="il-card rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <div style={{ fontWeight: 600 }} className="text-sm">{fmtDate(w.date)}</div>
                        <div style={{ color: C.textFaint }} className="text-xs mt-0.5">
                          {w.exercises.length} exercice{w.exercises.length > 1 ? "s" : ""} · {fmtDur(w.durationMin)}
                        </div>
                      </div>
                      <ChevronRight size={16} style={{ color: C.textFaint }} onClick={() => { setTab("history"); setExpandedHistory(w.id); }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "workout" && active && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div style={{ fontWeight: 700 }} className="text-lg">
                    {active.editId ? "Modifier la séance" : "Séance en cours"}
                  </div>
                  {timing && (
                    <span
                      className="il-num flex items-center gap-1 text-sm px-2 py-0.5 rounded-lg"
                      style={{ background: C.surface, border: `1px solid ${C.line}`, color: C.text }}
                    >
                      <Clock size={13} /> {fmtTimer(now - active.startedAt)}
                    </span>
                  )}
                </div>
                {active.fromTemplate && (
                  <div style={{ color: C.textFaint }} className="text-xs mt-0.5">D'après « {active.fromTemplate} »</div>
                )}
              </div>
              <button onClick={discardWorkout} style={{ color: C.textFaint }} className="text-xs flex items-center gap-1">
                <X size={13} /> Annuler
              </button>
            </div>

            {active.entries.length === 0 && (
              <div style={{ color: C.textFaint }} className="text-sm il-card rounded-2xl p-5 text-center">
                Ajoute ton premier exercice pour commencer.
              </div>
            )}

            {active.entries.map((entry) => (
              <div key={entry.id} className="il-card rounded-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  {entry.kind === "superset" ? (
                    <span style={{ color: C.rust }} className="text-xs font-bold uppercase tracking-wide">Superset</span>
                  ) : (
                    <div style={{ fontWeight: 600 }} className="text-sm">
                      {entry.name}
                      {entry.rest ? (
                        <span className="il-num text-xs font-normal" style={{ color: C.textFaint }}> · {formatRest(entry.rest)} repos</span>
                      ) : null}
                    </div>
                  )}
                  <Trash2 size={14} style={{ color: C.textFaint }} onClick={() => removeEntry(entry.id)} />
                </div>

                {entry.kind === "superset" ? (
                  <div className="flex flex-col gap-3">
                    {[
                      { label: entry.nameA, weightKey: "weightA", repsKey: "repsA", doneKey: "doneA", rest: entry.restA },
                      { label: entry.nameB, weightKey: "weightB", repsKey: "repsB", doneKey: "doneB", rest: entry.restB },
                    ].map((sub, subIdx) => (
                      <div key={subIdx}>
                        <div style={{ color: C.steel }} className="text-sm font-semibold mb-1.5">
                          {sub.label}
                          {sub.rest ? (
                            <span className="il-num text-xs font-normal" style={{ color: C.textFaint }}> · {formatRest(sub.rest)} repos</span>
                          ) : null}
                        </div>
                        <div style={{ background: C.surfaceRaised, border: `1px solid ${C.line}` }} className="rounded-xl p-2 flex flex-col gap-1.5">
                          <div
                            style={{ color: C.textFaint, display: "grid", gridTemplateColumns: SET_GRID, gap: "6px", fontSize: 10 }}
                            className="items-center px-0.5"
                          >
                            <span className="text-center">SÉRIE</span>
                            <span className="text-center">PRÉCÉDENT</span>
                            <span className="flex items-center justify-center gap-1">
                              <Dumbbell size={11} strokeWidth={2} /> KG
                            </span>
                            <span className="text-center">RÉPS</span>
                            <span className="text-center">✓</span>
                          </div>
                          {entry.sets.map((s, idx) => {
                            const prev = lastByExercise[sub.label]?.sets?.[idx];
                            return (
                              <div
                                key={idx}
                                style={{ display: "grid", gridTemplateColumns: SET_GRID, gap: "6px" }}
                                className="items-center"
                              >
                                <span
                                  className="il-num text-xs"
                                  style={{ background: C.surface, color: C.textDim, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}
                                >
                                  {idx + 1}
                                </span>
                                <span className="il-num text-center" style={{ color: C.textFaint, fontSize: 11 }}>
                                  {prev ? `${prev.weight}kg x ${prev.reps}` : "—"}
                                </span>
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  className="il-input il-num rounded-xl px-1 py-2 text-sm w-full text-center"
                                  style={{ background: C.surface }}
                                  placeholder={prev && prev.weight != null ? String(prev.weight) : "0"}
                                  value={s[sub.weightKey]}
                                  onChange={(e) => updateSet(entry.id, idx, sub.weightKey, e.target.value)}
                                />
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  className="il-input il-num rounded-xl px-1 py-2 text-sm w-full text-center"
                                  style={{ background: C.surface }}
                                  placeholder={prev && prev.reps != null ? String(prev.reps) : "0"}
                                  value={s[sub.repsKey]}
                                  onChange={(e) => updateSet(entry.id, idx, sub.repsKey, e.target.value)}
                                />
                                <button
                                  onClick={() => updateSet(entry.id, idx, sub.doneKey, !s[sub.doneKey])}
                                  style={{
                                    background: s[sub.doneKey] ? C.moss : C.surface,
                                    border: `1px solid ${s[sub.doneKey] ? C.moss : C.line}`,
                                    width: 30,
                                    height: 30,
                                    borderRadius: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    justifySelf: "center",
                                  }}
                                >
                                  {s[sub.doneKey] && <Check size={14} color={C.text} />}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div
                      style={{ color: C.textFaint, display: "grid", gridTemplateColumns: SET_GRID, gap: "6px", fontSize: 10 }}
                      className="items-center px-0.5"
                    >
                      <span className="text-center">SÉRIE</span>
                      <span className="text-center">PRÉCÉDENT</span>
                      <span className="flex items-center justify-center gap-1">
                        <Dumbbell size={11} strokeWidth={2} /> KG
                      </span>
                      <span className="text-center">RÉPS</span>
                      <span className="text-center">✓</span>
                    </div>
                    {entry.sets.map((s, idx) => {
                      const prev = lastByExercise[entry.name]?.sets?.[idx];
                      return (
                        <div
                          key={idx}
                          style={{ display: "grid", gridTemplateColumns: SET_GRID, gap: "6px" }}
                          className="items-center"
                        >
                          <span
                            className="il-num text-xs"
                            style={{ background: C.surfaceRaised, color: C.textDim, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600 }}
                          >
                            {idx + 1}
                          </span>
                          <span className="il-num text-center" style={{ color: C.textFaint, fontSize: 11 }}>
                            {prev ? `${prev.weight}kg x ${prev.reps}` : "—"}
                          </span>
                          <input
                            type="number"
                            inputMode="decimal"
                            className="il-input il-num rounded-xl px-1 py-2 text-sm w-full text-center"
                            placeholder={prev && prev.weight != null ? String(prev.weight) : "0"}
                            value={s.weight}
                            onChange={(e) => updateSet(entry.id, idx, "weight", e.target.value)}
                          />
                          <input
                            type="number"
                            inputMode="numeric"
                            className="il-input il-num rounded-xl px-1 py-2 text-sm w-full text-center"
                            placeholder={prev && prev.reps != null ? String(prev.reps) : "0"}
                            value={s.reps}
                            onChange={(e) => updateSet(entry.id, idx, "reps", e.target.value)}
                          />
                          <button
                            onClick={() => updateSet(entry.id, idx, "done", !s.done)}
                            style={{
                              background: s.done ? C.moss : "transparent",
                              border: `1px solid ${s.done ? C.moss : C.line}`,
                              width: 30,
                              height: 30,
                              borderRadius: "10px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              justifySelf: "center",
                            }}
                          >
                            {s.done && <Check size={14} color={C.text} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => openExercisePicker("workout")}
              style={{ border: `1px dashed ${C.line}`, color: C.textDim }}
              className="rounded-2xl p-3 text-sm flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Ajouter un exercice
            </button>
          </div>
        )}

        {tab === "history" && (
          <div className="flex flex-col gap-3">
            <div style={{ fontWeight: 700 }} className="text-lg mb-1">Historique</div>
            {workouts.length === 0 && (
              <div style={{ color: C.textFaint }} className="text-sm text-center py-10">Pas encore de séance enregistrée.</div>
            )}
            {workouts.map((w) => {
              const totalVolume = w.exercises.reduce(
                (sum, e) => sum + e.sets.reduce((s, set) => s + set.weight * set.reps, 0),
                0
              );
              const open = expandedHistory === w.id;
              const prCount = prCountByWorkoutId[w.id] || 0;
              const menuOpen = historyMenuId === w.id;
              return (
                <div key={w.id} className="il-card rounded-2xl">
                  {/* collapsed card — tap to expand */}
                  <div
                    onClick={() => {
                      setHistoryMenuId(null);
                      setExpandedHistory(open ? null : w.id);
                    }}
                    className="p-3 cursor-pointer relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div style={{ fontWeight: 700 }} className="text-base truncate">
                          {w.name || "Séance"}
                        </div>
                        <div style={{ color: C.textFaint }} className="text-xs mt-0.5">
                          {fmtDayDate(w.date)}
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setHistoryMenuId(menuOpen ? null : w.id);
                        }}
                        style={{ color: C.textFaint }}
                        className="p-1 -mt-1 -mr-1 flex-shrink-0"
                        aria-label="Options de la séance"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>

                    <div
                      className="flex items-center gap-4 mt-2 text-xs"
                      style={{ color: C.textDim }}
                    >
                      <span className="flex items-center gap-1">
                        <Clock size={13} /> {fmtDur(w.durationMin)}
                      </span>
                      <span className="il-num flex items-center gap-1">
                        <Dumbbell size={13} /> {fmtNum(totalVolume)} kg
                      </span>
                      <span className="il-num flex items-center gap-1">
                        <Trophy size={13} /> {prCount} RP
                      </span>
                    </div>

                    {menuOpen && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: C.surface, border: `1px solid ${C.line}`, boxShadow: "0 8px 24px rgba(74,55,54,0.12)" }}
                        className="absolute right-2 top-10 rounded-xl py-1 z-20"
                      >
                        <button
                          onClick={() => startEditWorkout(w)}
                          style={{ color: C.text }}
                          className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap w-full"
                        >
                          <Pencil size={14} /> Modifier la séance
                        </button>
                        <button
                          onClick={() => {
                            setHistoryMenuId(null);
                            deleteWorkout(w.id);
                          }}
                          style={{ color: C.rust }}
                          className="flex items-center gap-2 px-3 py-2 text-sm whitespace-nowrap w-full"
                        >
                          <Trash2 size={14} /> Supprimer la séance
                        </button>
                      </div>
                    )}
                  </div>

                  {/* expanded — best set per exercise */}
                  {open && (
                    <div className="px-3 pb-3 rounded-b-2xl overflow-hidden" style={{ borderTop: `1px solid ${C.line}` }}>
                      <div
                        className="grid gap-3 pt-2 pb-1 text-xs"
                        style={{ gridTemplateColumns: "1fr auto", color: C.textFaint, fontWeight: 600 }}
                      >
                        <span>Exercice</span>
                        <span>Meilleure série</span>
                      </div>
                      {w.exercises.map((e, i) => {
                        const inSuper = !!e.superset;
                        return (
                          <div
                            key={i}
                            className="grid gap-3 items-baseline text-sm py-1"
                            style={{
                              gridTemplateColumns: "1fr auto",
                              borderLeft: `2px solid ${inSuper ? C.rust : "transparent"}`,
                              paddingLeft: inSuper ? 8 : 0,
                            }}
                          >
                            <span style={{ color: C.textDim }} className="min-w-0 truncate">
                              <span className="il-num">{e.sets.length}</span> × {e.name}
                            </span>
                            <span style={{ color: C.text }} className="il-num whitespace-nowrap">
                              {fmtBestSet(bestSet(e.sets))}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {tab === "templates" && !templateDraft && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1">
              <div style={{ fontWeight: 700 }} className="text-lg">Mes séances</div>
              <button
                onClick={openNewTemplate}
                style={{ color: C.amber, border: `1px solid ${C.amber}` }}
                className="px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
              >
                <Plus size={13} /> Créer
              </button>
            </div>

            {templates.length === 0 ? (
              <div style={{ color: C.textFaint }} className="text-sm text-center py-10">
                Crée une séance (ex. « Push », « Jambes ») pour la relancer en un tap.
              </div>
            ) : (
              templates.map((t) => (
                <div key={t.id} className="il-card rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div style={{ fontWeight: 600 }} className="text-sm">{t.name}</div>
                    <div className="flex items-center gap-3">
                      <Pencil size={14} style={{ color: C.textFaint }} onClick={() => openEditTemplate(t)} />
                      <Trash2 size={14} style={{ color: C.textFaint }} onClick={() => deleteTemplate(t.id)} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {t.exercises.map((ex) => (
                      <span key={ex.name} style={{ background: C.surfaceRaised, color: C.textDim }} className="text-xs px-2 py-0.5 rounded">
                        {ex.name} <span className="il-num">
                          ×{ex.sets}
                          {ex.pair
                            ? ` · ${formatRest(ex.restA)}/${formatRest(ex.restB)}`
                            : ex.rest ? ` · ${formatRest(ex.rest)}` : ""}
                        </span>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => startFromTemplate(t)}
                    style={{ background: C.amber, color: C.text }}
                    className="w-full py-2 rounded-full font-semibold text-sm flex items-center justify-center gap-1.5"
                  >
                    <Play size={13} fill={C.text} /> Démarrer cette séance
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "templates" && templateDraft && (
          <div className="flex flex-col gap-3 pb-2">
            <div className="flex items-center justify-between">
              <div style={{ fontWeight: 700 }} className="text-lg">
                {templateDraft.id ? "Modifier la séance" : "Nouvelle séance"}
              </div>
              <button onClick={cancelTemplateDraft} style={{ color: C.textFaint }} className="text-xs flex items-center gap-1">
                <X size={13} /> Annuler
              </button>
            </div>

            <input
              autoFocus
              className="il-input rounded-xl px-3 py-2 text-sm"
              placeholder="Nom de la séance (ex. Push, Jambes, Full Body…)"
              value={templateDraft.name}
              onChange={(e) => setTemplateDraft((d) => ({ ...d, name: e.target.value }))}
            />

            <div className="flex flex-col gap-1.5">
              {templateDraft.exercises.length === 0 && (
                <div style={{ color: C.textFaint }} className="text-sm il-card rounded-2xl p-4 text-center">
                  Ajoute les exercices qui composent cette séance.
                </div>
              )}
              {templateDraft.exercises.map((ex, i) => (
                <div key={ex.name} className="il-card rounded-2xl px-3 py-2 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm flex-1 min-w-0">
                      <span className="il-num" style={{ color: C.textFaint }}>{i + 1}.</span> {ex.name}
                      {!ex.pair && (
                        <button
                          onClick={() => cycleDraftExerciseRest(ex.name)}
                          style={{ color: C.steel }}
                          className="il-num text-xs ml-1.5"
                        >
                          · {formatRest(ex.rest)} repos
                        </button>
                      )}
                    </span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => adjustDraftExerciseSets(ex.name, -1)}
                        style={{ background: C.surfaceRaised, color: C.text }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                      >
                        −
                      </button>
                      <span className="il-num text-sm w-14 text-center" style={{ color: C.textDim }}>
                        {ex.sets} série{ex.sets > 1 ? "s" : ""}
                      </span>
                      <button
                        onClick={() => adjustDraftExerciseSets(ex.name, 1)}
                        style={{ background: C.surfaceRaised, color: C.text }}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold"
                      >
                        +
                      </button>
                      <Trash2 size={14} style={{ color: C.textFaint }} onClick={() => removeExerciseFromDraft(ex.name)} />
                    </div>
                  </div>
                  {ex.pair && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pl-4">
                      <button onClick={() => cycleDraftExerciseRest(ex.name, "A")} style={{ color: C.steel }} className="il-num text-xs">
                        {ex.pair[0]} · {formatRest(ex.restA)} repos
                      </button>
                      <button onClick={() => cycleDraftExerciseRest(ex.name, "B")} style={{ color: C.steel }} className="il-num text-xs">
                        {ex.pair[1]} · {formatRest(ex.restB)} repos
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => openExercisePicker("template")}
              style={{ border: `1px dashed ${C.line}`, color: C.textDim }}
              className="rounded-2xl p-3 text-sm flex items-center justify-center gap-2"
            >
              <Plus size={15} /> Ajouter un exercice
            </button>

            <button
              onClick={saveTemplateDraft}
              disabled={!templateDraft.name.trim() || templateDraft.exercises.length === 0}
              style={{
                background: templateDraft.name.trim() && templateDraft.exercises.length > 0 ? C.amber : C.surfaceRaised,
                color: templateDraft.name.trim() && templateDraft.exercises.length > 0 ? C.text : C.textFaint,
              }}
              className="w-full py-3 rounded-full font-semibold mt-1"
            >
              Enregistrer la séance
            </button>
          </div>
        )}

        {tab === "pr" && (
          <div className="flex flex-col gap-3">
            <div style={{ fontWeight: 700 }} className="text-lg mb-1">Records</div>
            {loggedExerciseNames.length === 0 ? (
              <div style={{ color: C.textFaint }} className="text-sm text-center py-10">
                Enregistre une séance pour voir apparaître tes records ici.
              </div>
            ) : (
              <>
                <select
                  className="il-input rounded-xl px-3 py-2 text-sm"
                  value={prExercise || ""}
                  onChange={(e) => setPrExercise(e.target.value || null)}
                >
                  <option value="">Choisir un exercice…</option>
                  {loggedExerciseNames.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>

                {prExercise && bestEver && (
                  <>
                    <div className="il-card rounded-2xl p-4 flex items-center gap-3" style={{ borderColor: C.rust }}>
                      <Trophy size={22} style={{ color: C.rust }} />
                      <div>
                        <div style={{ color: C.textDim }} className="text-xs">Record — {prExercise}</div>
                        <div className="il-num text-xl" style={{ fontWeight: 700 }}>
                          {bestEver.weight} kg × {bestEver.reps} <span style={{ color: C.textFaint, fontWeight: 400 }} className="text-sm">(≈{estOneRM(bestEver.weight, bestEver.reps)}kg 1RM)</span>
                        </div>
                      </div>
                    </div>

                    <div className="il-card rounded-2xl p-3">
                      <div style={{ color: C.textDim }} className="text-xs mb-3">Progression (meilleure série par séance)</div>
                      <div className="flex items-end gap-1.5 h-32">
                        {prHistory.map((r, i) => {
                          const max = Math.max(...prHistory.map((x) => x.weight), 1);
                          const h = Math.max(6, (r.weight / max) * 100);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-1">
                              <span className="il-num" style={{ fontSize: "9px", color: C.textFaint }}>{r.weight}</span>
                              <div style={{ height: `${h}%`, width: "100%", background: i === prHistory.length - 1 ? C.amber : C.steel, borderRadius: "2px 2px 0 0" }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* bottom bar — fixed to the viewport bottom so it stays put on scroll
          and zoom. Finish/discard while in an active workout, else the tabs. */}
      {tab === "workout" && active ? (
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
            onClick={finishWorkout}
            style={{ background: C.amber, color: C.text }}
            className="w-full py-3 rounded-full font-semibold flex items-center justify-center gap-2"
          >
            {active?.editId ? (
              <>
                <Check size={15} /> Enregistrer les modifications
              </>
            ) : (
              <>
                <Square size={15} fill={C.text} /> Terminer la séance
              </>
            )}
          </button>
        </div>
      ) : !(tab === "templates" && templateDraft) ? (
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
          <NavBtn id="home" icon={Home} label="Accueil" />
          <NavBtn id="templates" icon={ClipboardList} label="Séances" />
          <NavBtn id="history" icon={History} label="Historique" />
          <NavBtn id="pr" icon={Trophy} label="Records" />
        </div>
      ) : null}

      {/* exercise picker modal */}
      {showPicker && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={closePicker}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.bg, borderTop: `1px solid ${C.line}`, maxHeight: "70vh" }}
            className="w-full max-w-md rounded-t-3xl p-4 flex flex-col"
          >
            {pickerStep === "search" ? (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div style={{ fontWeight: 700 }}>
                    {supersetStage === "a" && "Superset · 1er exercice"}
                    {supersetStage === "b" && "Superset · 2e exercice"}
                    {!supersetStage && "Choisir un exercice"}
                  </div>
                  <X size={18} onClick={closePicker} style={{ color: C.textFaint }} />
                </div>
                {pickerMode === "template" && !supersetStage && (
                  <div style={{ color: C.textFaint }} className="text-xs mb-2 -mt-2">Pour « {templateDraft?.name || "cette séance"} »</div>
                )}
                {supersetStage === "b" && (
                  <div className="flex items-center justify-between mb-2 -mt-1">
                    <span style={{ color: C.textDim }} className="text-xs">1er : {pendingNameA}</span>
                    <button onClick={cancelSupersetBuild} style={{ color: C.textFaint }} className="text-xs">Annuler le superset</button>
                  </div>
                )}
                <div className="relative mb-2">
                  <Search size={14} style={{ color: C.textFaint, position: "absolute", left: 10, top: 10 }} />
                  <input
                    autoFocus
                    className="il-input w-full rounded-xl pl-8 pr-3 py-2 text-sm"
                    placeholder="Rechercher ou créer un exercice…"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredLibrary.length === 0 && pickerQuery.trim()) {
                        addCustomExercise(pickerQuery);
                      }
                    }}
                  />
                </div>
                {!supersetStage && !pickerQuery.trim() && (
                  <button
                    onClick={startSupersetBuild}
                    style={{ background: C.surfaceRaised, color: C.steel }}
                    className="rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-1.5 mb-3"
                  >
                    <Plus size={14} /> Créer un superset (deux exos enchaînés)
                  </button>
                )}
                <div className="overflow-y-auto flex flex-col gap-1">
                  {filteredLibrary.map((e) => (
                    <button
                      key={e.name}
                      onClick={() => chooseExercise(e.name)}
                      className="flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
                      style={{ background: C.surface }}
                    >
                      <span className="text-sm">{e.name}</span>
                      <span style={{ color: C.textFaint }} className="text-xs">{e.category}</span>
                    </button>
                  ))}
                  {pickerQuery.trim() && filteredLibrary.length === 0 && (
                    <button
                      onClick={() => addCustomExercise(pickerQuery)}
                      style={{ color: C.amber, border: `1px dashed ${C.amber}` }}
                      className="rounded-xl py-2.5 text-sm flex items-center justify-center gap-1.5"
                    >
                      <Plus size={14} /> Créer « {pickerQuery.trim()} »
                    </button>
                  )}
                </div>
              </>
            ) : pickerStep === "sets" ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <ChevronRight size={16} style={{ color: C.textFaint, transform: "rotate(180deg)" }} onClick={() => setPickerStep("search")} />
                  <div style={{ fontWeight: 700 }}>
                    {pendingKind === "superset" ? `${pendingNameA} + ${pendingNameB}` : pendingExerciseName}
                  </div>
                </div>
                <div style={{ color: C.textFaint }} className="text-sm mb-4">
                  {pendingKind === "superset" ? "Combien de rounds ?" : "Combien de séries ?"}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <button
                      key={n}
                      onClick={() => chooseSetCount(n)}
                      style={{ background: n === 3 ? C.amber : C.surfaceRaised, color: C.text }}
                      className="il-num py-3 rounded-xl text-base font-semibold flex items-center justify-center"
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <ChevronRight
                    size={16}
                    style={{ color: C.textFaint, transform: "rotate(180deg)" }}
                    onClick={() => setPickerStep(pickerStep === "rest-b" ? "rest" : "sets")}
                  />
                  <div style={{ fontWeight: 700 }}>
                    {pendingKind === "superset" ? (pickerStep === "rest-b" ? pendingNameB : pendingNameA) : pendingExerciseName}
                  </div>
                </div>
                <div style={{ color: C.textFaint }} className="text-sm mb-4">
                  {pendingKind === "superset"
                    ? `Temps de repos après ${pickerStep === "rest-b" ? "cet exercice" : "le 1er exercice"} ?`
                    : "Temps de repos entre les séries ?"}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {REST_OPTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => chooseRest(s)}
                      style={{ background: s === 120 ? C.amber : C.surfaceRaised, color: C.text }}
                      className="il-num py-3 rounded-xl text-sm font-semibold flex items-center justify-center"
                    >
                      {formatRest(s)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* hidden file input for avatar upload */}
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarFile} />

      {/* profile menu */}
      {showProfileMenu && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowProfileMenu(false)}>
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
            <button
              onClick={openRename}
              style={{ background: C.surface }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
            >
              <Pencil size={16} style={{ color: C.textDim }} /> Changer mon nom
            </button>
            <button
              onClick={triggerAvatarUpload}
              style={{ background: C.surface }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
            >
              <User size={16} style={{ color: C.textDim }} /> Changer ma photo
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setShowAdmin(true);
                }}
                style={{ background: C.surface }}
                className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
              >
                <ShieldCheck size={16} style={{ color: C.steel }} /> Espace administrateur
              </button>
            )}
            <button
              onClick={signOut}
              style={{ background: C.surface }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-left text-sm"
            >
              <LogOut size={16} style={{ color: C.textDim }} /> Se déconnecter
            </button>
            <button
              onClick={() => setShowProfileMenu(false)}
              style={{ color: C.textFaint }}
              className="text-center text-sm py-2.5 mt-1"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* rename modal */}
      {showRename && (
        <div className="fixed inset-0 flex items-end justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }} onClick={() => setShowRename(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: C.bg, borderTop: `1px solid ${C.line}` }}
            className="w-full max-w-md rounded-t-3xl p-4 flex flex-col gap-3"
          >
            <div style={{ fontWeight: 700 }}>Changer mon nom</div>
            <input
              autoFocus
              className="il-input rounded-xl px-3 py-2 text-sm"
              placeholder="Prénom"
              value={renameValue}
              onChange={(e) => {
                setRenameValue(e.target.value);
                setRenameError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && confirmRename()}
            />
            {renameError && <div style={{ color: C.rust }} className="text-xs">{renameError}</div>}
            <div className="flex gap-2">
              <button onClick={() => setShowRename(false)} style={{ color: C.textDim, border: `1px solid ${C.line}` }} className="flex-1 py-2.5 rounded-full text-sm">
                Annuler
              </button>
              <button onClick={confirmRename} style={{ background: C.amber, color: C.text }} className="flex-1 py-2.5 rounded-full text-sm font-semibold">
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
