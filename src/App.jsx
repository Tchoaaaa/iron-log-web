import { useState, useEffect, useMemo } from "react";
import { C } from "./lib/theme";
import * as api from "./lib/api";
import { useAuth } from "./lib/useAuth";
import AuthScreen from "./screens/AuthScreen";
import AdminDashboard from "./screens/AdminDashboard";
import { EXERCISE_LIBRARY } from "./data/exercises";
import { dailyQuote } from "./lib/quotes";
import HistoryScreen from "./screens/HistoryScreen";
import PRScreen from "./screens/PRScreen";
import HomeScreen from "./screens/HomeScreen";
import TemplatesScreen from "./screens/TemplatesScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import AppHeader from "./components/AppHeader";
import ProfileMenuSheet from "./components/ProfileMenuSheet";
import DataEditModal from "./components/DataEditModal";
import BottomBar from "./components/BottomBar";
import SessionSummaryModal from "./components/SessionSummaryModal";
import { useProfile } from "./hooks/useProfile";
import { useExerciseLibrary } from "./hooks/useExerciseLibrary";
import { useWorkouts } from "./hooks/useWorkouts";
import { useTemplates } from "./hooks/useTemplates";
import { useActiveSession } from "./hooks/useActiveSession";

// Library seeded into a new account (grouped by muscle group). See
// src/data/exercises.js and supabase-exercises.sql for existing accounts.
const DEFAULT_EXERCISES = EXERCISE_LIBRARY;

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

  const profileHook = useProfile({ email });
  const libraryHook = useExerciseLibrary({ defaultExercises: DEFAULT_EXERCISES });
  const workoutsHook = useWorkouts();
  const templatesHook = useTemplates();
  const activeSession = useActiveSession({ userId: session.user.id });
  const { workouts, lastByExercise } = workoutsHook;
  const { templates, templateDraft } = templatesHook;
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [dataError, setDataError] = useState("");
  const [tab, setTab] = useState("home");
  const [expandedHistory, setExpandedHistory] = useState(null);

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
        profileHook.applyProfileFromServer(prof);
        libraryHook.applyFromServer(ex);
        workoutsHook.applyFromServer(wk);
        templatesHook.applyFromServer(tpl);
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

  // Thin navigation wrappers: useActiveSession owns the session's lifecycle
  // and persistence, this component owns which tab is showing.
  const startWorkout = () => {
    activeSession.startWorkout();
    setTab("workout");
  };
  const startEditWorkout = (w) => {
    setExpandedHistory(null);
    activeSession.startEditWorkout(w);
    setTab("workout");
  };
  const startFromTemplate = (tpl) => {
    activeSession.startFromTemplate(tpl);
    setTab("workout");
  };
  const discardWorkout = () => {
    activeSession.discardWorkout();
    setTab("home");
  };
  const finishWorkout = () =>
    activeSession.finishWorkout({
      workouts,
      addWorkout: workoutsHook.addWorkout,
      replaceWorkout: workoutsHook.replaceWorkout,
      onError: setDataError,
      onEmpty: () => setTab("home"),
      onEditSaved: () => setTab("history"),
    });
  const dismissSessionSummary = () => {
    activeSession.dismissSessionSummary();
    setTab("history");
  };

  const deleteWorkout = (id) => workoutsHook.deleteWorkout(id, { onError: setDataError });
  const quoteOfTheDay = useMemo(() => dailyQuote(), []);

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
          fontFamily: '"Space Grotesk", ui-sans-serif, system-ui, -apple-system, sans-serif',
          maxWidth: 430,
          minHeight: "100dvh",
          position: "relative",
        }}
        className="w-full flex flex-col"
      >
      <style>{`
        .il-input { background: ${C.surfaceRaised}; border: 1px solid ${C.line}; color: ${C.text}; }
        .il-input::placeholder { color: ${C.textFaint}; }
        .il-input:focus { outline: none; border-color: ${C.amber}; }
        .il-num { font-variant-numeric: tabular-nums; font-family: "Space Mono", "SF Mono", ui-monospace, Menlo, monospace; }
        .il-card { background: ${C.surface}; border: 1px solid ${C.line}; }
        .il-logo { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; }
        .il-brand { font-family: "Space Grotesk", ui-sans-serif, system-ui, sans-serif; text-transform: uppercase; letter-spacing: 0.24em; }
      `}</style>

      <AppHeader
        isAdmin={isAdmin}
        onShowAdmin={() => setShowAdmin(true)}
        avatarUrl={profileHook.avatarUrl}
        onOpenProfileMenu={profileHook.openProfileMenu}
      />

      {/* content — the page scrolls; the fixed bottom bar sits on top of the
          reserved bottom padding */}
      <div
        className="flex-1 px-4 py-4"
        style={{ paddingBottom: "calc(84px + env(safe-area-inset-bottom))" }}
      >
        {tab === "home" && (
          <HomeScreen
            dataError={dataError}
            quoteOfTheDay={quoteOfTheDay}
            workouts={workouts}
            templates={templates}
            onStartWorkout={startWorkout}
            onGoToTemplates={() => setTab("templates")}
            onStartFromTemplate={startFromTemplate}
            onJumpToWorkoutInHistory={(id) => { setTab("history"); setExpandedHistory(id); }}
          />
        )}

        {tab === "workout" && activeSession.active && (
          <WorkoutScreen
            activeSession={activeSession}
            lastByExercise={lastByExercise}
            libraryHook={libraryHook}
            onDiscard={discardWorkout}
          />
        )}

        {tab === "history" && (
          <HistoryScreen
            workouts={workouts}
            expandedHistory={expandedHistory}
            setExpandedHistory={setExpandedHistory}
            onEditWorkout={startEditWorkout}
            onDeleteWorkout={deleteWorkout}
          />
        )}

        {tab === "templates" && (
          <TemplatesScreen
            templatesHook={templatesHook}
            libraryHook={libraryHook}
            onStartFromTemplate={startFromTemplate}
            onError={setDataError}
          />
        )}

        {tab === "pr" && <PRScreen workouts={workouts} />}
      </div>

      <BottomBar
        tab={tab}
        active={activeSession.active}
        templateDraft={templateDraft}
        finishing={activeSession.finishing}
        onFinishWorkout={finishWorkout}
        onSelectTab={setTab}
      />

      {/* hidden file input for avatar upload */}
      <input ref={profileHook.fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={profileHook.handleAvatarFile} />

      {activeSession.sessionSummary && (
        <SessionSummaryModal summary={activeSession.sessionSummary} onDone={dismissSessionSummary} />
      )}

      {profileHook.showProfileMenu && (
        <ProfileMenuSheet
          email={email}
          profile={profileHook.profile}
          avatarUrl={profileHook.avatarUrl}
          metrics={profileHook.metrics}
          isAdmin={isAdmin}
          onClose={profileHook.closeProfileMenu}
          onOpenData={profileHook.openData}
          onTriggerAvatarUpload={profileHook.triggerAvatarUpload}
          onShowAdmin={() => {
            profileHook.closeProfileMenu();
            setShowAdmin(true);
          }}
          onSignOut={profileHook.signOut}
        />
      )}

      {profileHook.showData && (
        <DataEditModal
          dataForm={profileHook.dataForm}
          dataFormError={profileHook.dataFormError}
          dataBusy={profileHook.dataBusy}
          onFieldChange={profileHook.setDataFormField}
          onCancel={profileHook.closeData}
          onSave={profileHook.saveData}
        />
      )}
      </div>
    </div>
  );
}
