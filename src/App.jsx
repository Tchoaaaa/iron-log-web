import { useState, useEffect, useEffectEvent } from "react";
import * as api from "./lib/api";
import { useAuth } from "./lib/useAuth";
import { EXERCISE_LIBRARY } from "./data/exercises";
import { EMPTY_FILTERS } from "./lib/historyFilters";
import AuthScreen from "./screens/AuthScreen";
import AdminDashboard from "./screens/AdminDashboard";
import HistoryScreen from "./screens/HistoryScreen";
import PRScreen from "./screens/PRScreen";
import HomeScreen from "./screens/HomeScreen";
import TemplatesScreen from "./screens/TemplatesScreen";
import WorkoutScreen from "./screens/WorkoutScreen";
import ProfileScreen from "./screens/ProfileScreen";
import OnboardingScreen from "./screens/OnboardingScreen";
import DataEditModal from "./components/DataEditModal";
import BottomBar from "./components/BottomBar";
import SessionSummaryModal from "./components/SessionSummaryModal";
import Drawer from "./components/Drawer";
import { useProfile } from "./hooks/useProfile";
import { useExerciseLibrary } from "./hooks/useExerciseLibrary";
import { useWorkouts } from "./hooks/useWorkouts";
import { useTemplates } from "./hooks/useTemplates";
import { useActiveSession } from "./hooks/useActiveSession";
export default function App() {
  const { session, loading, error } = useAuth();
  if (loading) return <div className="loading-screen">Chargement…</div>;
  if (!session) return <AuthScreen authError={error} />;
  return <GymApp key={session.user.id} session={session} />;
}
function GymApp({ session }) {
  const profileHook = useProfile({
    email: session.user.email,
    user: session.user,
  });
  const libraryHook = useExerciseLibrary({
    defaultExercises: EXERCISE_LIBRARY,
  });
  const workoutsHook = useWorkouts();
  const templatesHook = useTemplates();
  const activeSession = useActiveSession({
    userId: session.user.id,
    autoRest: profileHook.autoRest,
  });
  const { workouts, lastByExercise } = workoutsHook;
  const { templates, templateDraft } = templatesHook;
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reload, setReload] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [dataError, setDataError] = useState("");
  const [tab, setTab] = useState("home");
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [historyOrigin, setHistoryOrigin] = useState("history");
  const [historyView, setHistoryView] = useState("history");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeNotice, setActiveNotice] = useState(false);
  const [confirmed, setConfirmed] = useState(
    () =>
      new URLSearchParams(window.location.search).get("confirmed") === "1" &&
      !!session.user.email_confirmed_at,
  );
  const applyInitialData = useEffectEvent(([prof, ex, wk, tpl, admin]) => {
    profileHook.applyProfileFromServer(prof);
    libraryHook.applyFromServer(ex);
    workoutsHook.applyFromServer(wk);
    templatesHook.applyFromServer(tpl);
    setIsAdmin(!!admin);
  });
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const results = await Promise.all([
          api.getProfile(),
          api.listExercisesOrSeed(EXERCISE_LIBRARY),
          api.listWorkouts(),
          api.listTemplates(),
          api.checkIsAdmin(),
        ]);
        if (!alive) return;
        applyInitialData(results);
      } catch (err) {
        if (alive)
          setLoadError(err.message || "Erreur de chargement des données.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [session.user.id, reload]);
  const start = (action) => {
    if (activeSession.active) {
      setActiveNotice(true);
      return;
    }
    action();
    setTab("workout");
  };
  const startWorkout = () => start(activeSession.startWorkout);
  const startFromTemplate = (tpl) =>
    start(() => activeSession.startFromTemplate(tpl));
  const editWorkout = (w) => start(() => activeSession.startEditWorkout(w));
  const finish = () =>
    activeSession.finishWorkout({
      workouts,
      addWorkout: workoutsHook.addWorkout,
      replaceWorkout: workoutsHook.replaceWorkout,
      onError: setDataError,
      onEmpty: () => setTab("home"),
      onEditSaved: () => setTab("history"),
    });
  const selectTab = (next) => {
    setTab(next);
    if (next === "history") setHistoryOrigin("history");
    window.scrollTo({ top: 0 });
  };
  if (loading)
    return <div className="loading-screen">Chargement de ton espace…</div>;
  if (loadError)
    return (
      <main className="app-shell app-content">
        <h1 className="page-title">Chargement interrompu</h1>
        <p className="error my-5" role="alert">
          {loadError}
        </p>
        <button
          className="primary"
          onClick={() => {
            setLoading(true);
            setLoadError("");
            setReload((n) => n + 1);
          }}
        >
          Réessayer
        </button>
        <button className="text-button ml-4" onClick={profileHook.signOut}>
          Se déconnecter
        </button>
      </main>
    );
  if (showAdmin && isAdmin)
    return <AdminDashboard onExit={() => setShowAdmin(false)} />;
  return (
    <div className="app-shell">
      {profileHook.needsOnboarding && !dataError ? (
        <OnboardingScreen profileHook={profileHook} confirmed={confirmed} />
      ) : (
        <>
          <main className="app-content">
            {dataError && (
              <div className="error notice mb-5" role="alert">
                {dataError}
                <button
                  className="text-button text-xs"
                  onClick={() => setDataError("")}
                >
                  Fermer
                </button>
              </div>
            )}
            {confirmed && (
              <div className="notice mb-5" role="status">
                Ton adresse e-mail est confirmée.
                <button
                  className="text-button text-xs"
                  onClick={() => {
                    setConfirmed(false);
                    const url = new URL(window.location.href);
                    url.searchParams.delete("confirmed");
                    window.history.replaceState(null, "", url);
                  }}
                >
                  Fermer
                </button>
              </div>
            )}
            {tab === "home" && (
              <HomeScreen
                workouts={workouts}
                templates={templates}
                profile={profileHook.profile}
                avatarUrl={profileHook.avatarUrl}
                active={activeSession.active}
                onStartWorkout={startWorkout}
                onGoToTemplates={() => selectTab("templates")}
                onGoToProfile={() => selectTab("profile")}
                onGoToHistory={() => selectTab("history")}
                onResume={() => selectTab("workout")}
                onStartFromTemplate={startFromTemplate}
                onJumpToWorkoutInHistory={(id) => {
                  setTab("history");
                  setHistoryView("history");
                  setHistoryOrigin("home");
                  setExpandedHistory(id);
                }}
              />
            )}
            {tab === "workout" && activeSession.active && (
              <WorkoutScreen
                activeSession={activeSession}
                lastByExercise={lastByExercise}
                libraryHook={libraryHook}
                onBack={() => selectTab("home")}
                onDiscard={() => {
                  const editing = !!activeSession.active.editId;
                  activeSession.discardWorkout();
                  selectTab(editing ? "history" : "home");
                }}
              />
            )}
            {tab === "history" && (
              <>
                {!expandedHistory && (
                  <>
                    <p className="eyebrow">TES ENTRAÎNEMENTS, DANS LE TEMPS</p>
                    <h1 className="page-title mt-2 mb-5">Suivi</h1>
                    <div
                      className="segmented mb-6"
                      role="group"
                      aria-label="Vue du suivi"
                    >
                      <button
                        aria-pressed={historyView === "history"}
                        onClick={() => setHistoryView("history")}
                      >
                        Historique
                      </button>
                      <button
                        aria-pressed={historyView === "performance"}
                        onClick={() => setHistoryView("performance")}
                      >
                        Performances
                      </button>
                    </div>
                  </>
                )}
                {historyView === "history" || expandedHistory ? (
                  <HistoryScreen
                    workouts={workouts}
                    expandedHistory={expandedHistory}
                    setExpandedHistory={setExpandedHistory}
                    onEditWorkout={editWorkout}
                    onDeleteWorkout={(id) =>
                      workoutsHook.deleteWorkout(id, { onError: setDataError })
                    }
                    onStartWorkout={startWorkout}
                    filters={filters}
                    setFilters={setFilters}
                    onBack={() => {
                      if (historyOrigin === "home") selectTab("home");
                    }}
                  />
                ) : (
                  <PRScreen workouts={workouts} />
                )}
              </>
            )}
            <div hidden={tab !== "templates"}>
              <TemplatesScreen
                templatesHook={templatesHook}
                libraryHook={libraryHook}
                onStartFromTemplate={startFromTemplate}
                onError={setDataError}
              />
            </div>
            {tab === "profile" && (
              <ProfileScreen
                profileHook={profileHook}
                email={session.user.email}
                isAdmin={isAdmin}
                onShowAdmin={() => setShowAdmin(true)}
              />
            )}
          </main>
          <BottomBar
            tab={tab}
            active={activeSession.active}
            templateDraft={templateDraft}
            finishing={activeSession.finishing}
            onFinishWorkout={finish}
            onSelectTab={selectTab}
          />
        </>
      )}
      {activeSession.sessionSummary && (
        <SessionSummaryModal
          summary={activeSession.sessionSummary}
          onDone={() => {
            activeSession.dismissSessionSummary();
            setExpandedHistory(null);
            setHistoryView("history");
            setTab("history");
          }}
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
      {activeNotice && (
        <Drawer
          title="Une séance est déjà ouverte"
          onClose={() => setActiveNotice(false)}
        >
          <p className="muted text-sm mb-5">
            Reprends-la pour la terminer ou l’abandonner avant d’en ouvrir une
            autre.
          </p>
          <button
            className="primary w-full"
            onClick={() => {
              setActiveNotice(false);
              selectTab("workout");
            }}
          >
            Reprendre ma séance
          </button>
        </Drawer>
      )}
    </div>
  );
}
