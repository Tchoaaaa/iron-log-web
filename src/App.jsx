import { useState, useEffect, useEffectEvent } from "react";
import * as api from "./lib/api";
import { useAuth } from "./lib/useAuth";
import { EXERCISE_LIBRARY } from "./data/exercises";
import { EMPTY_FILTERS } from "./lib/historyFilters";
import AuthScreen from "./screens/AuthScreen";
import ResetPasswordScreen from "./screens/ResetPasswordScreen";
import AdminDashboard from "./screens/AdminDashboard";
import PerformanceScreen from "./screens/PerformanceScreen";
import HomeScreen from "./screens/HomeScreen";
import WeekSetupScreen from "./screens/WeekSetupScreen";
import PlannedSessionDrawer from "./components/PlannedSessionDrawer";
import { useWeeklyPlan } from "./hooks/useWeeklyPlan";
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
import { useRestAlerts } from "./hooks/useRestAlerts";
import { useActiveSession } from "./hooks/useActiveSession";
export default function App() {
  const { session, loading, error, recovery, clearRecovery } = useAuth();
  if (loading) return <div className="loading-screen">Chargement…</div>;
  if (recovery) return <ResetPasswordScreen onDone={clearRecovery} />;
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
  useRestAlerts(activeSession.active, profileHook.restAlerts);
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
  const [historyOrigin, setHistoryOrigin] = useState("performance");
  const [performanceView, setPerformanceView] = useState("overview");
  const [performancePeriod, setPerformancePeriod] = useState("week");
  const [performanceExercise, setPerformanceExercise] = useState(null);
  const [performanceWeeks, setPerformanceWeeks] = useState(8);
  const [recordMuscle, setRecordMuscle] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [activeNotice, setActiveNotice] = useState(false);
  const [confirmed, setConfirmed] = useState(
    () =>
      new URLSearchParams(window.location.search).get("confirmed") === "1" &&
      !!session.user.email_confirmed_at,
  );
  const [selectedWeekDay, setSelectedWeekDay] = useState(null);
  const weekly = useWeeklyPlan({ user: session.user, templates, workouts, enabled: !loading && !loadError });
  const selectedWeekRow = weekly.rows.find(row => row.key === selectedWeekDay && row.slot);
  const openWeek = () => { setSelectedWeekDay(null); setTab("week"); window.scrollTo({ top: 0 }); };
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
  const startFromTemplate = (tpl, plannedSlot = null) =>
    start(() => activeSession.startFromTemplate(tpl, plannedSlot));
  const startPlanned = row => {
    if (row.template) startFromTemplate(row.template, { weekStart: row.weekStart, day: row.key, templateId: row.slot.templateId });
  };
  const editWorkout = (w) => start(() => activeSession.startEditWorkout(w));
  const finish = () =>
    activeSession.finishWorkout({
      workouts,
      addWorkout: workoutsHook.addWorkout,
      replaceWorkout: workoutsHook.replaceWorkout,
      onError: setDataError,
      onEmpty: () => setTab("home"),
      onEditSaved: () => setTab("performance"),
      onRecorded: weekly.recordCompletion,
    });
  const selectTab = (next) => {
    setTab(next);
    if (next === "performance") {
      setHistoryOrigin("performance");
      setExpandedHistory(null);
      setPerformanceExercise(null);
    }
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
                weekly={weekly}
                onEditWeek={openWeek}
                onSelectWeekDay={setSelectedWeekDay}
                onStartPlanned={startPlanned}
                workouts={workouts}
                templates={templates}
                profile={profileHook.profile}
                avatarUrl={profileHook.avatarUrl}
                active={activeSession.active}
                onStartWorkout={startWorkout}
                onGoToTemplates={() => selectTab("templates")}
                onGoToProfile={() => selectTab("profile")}
                onGoToHistory={() => { setPerformanceView("overview"); selectTab("performance"); }}
                onResume={() => selectTab("workout")}
                onStartFromTemplate={startFromTemplate}
                onJumpToWorkoutInHistory={(id) => {
                  setTab("performance");
                  setPerformanceView("history");
                  setHistoryOrigin("home");
                  setPerformanceExercise(null);
                  setExpandedHistory(id);
                }}
                onFinishWorkout={finish}
                finishing={activeSession.finishing}
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
                  if (editing) setTab("performance"); else selectTab("home");
                }}
              />
            )}
            {tab === "performance" && (
              <PerformanceScreen
                workouts={workouts}
                exercises={libraryHook.exercises}
                recordMuscle={recordMuscle}
                onRecordMuscle={setRecordMuscle}
                view={performanceView}
                onView={setPerformanceView}
                period={performancePeriod}
                onPeriod={setPerformancePeriod}
                exercise={performanceExercise}
                onExercise={name => { setPerformanceExercise(name); if (name) setPerformanceWeeks(8); window.scrollTo({ top: 0 }); }}
                weeks={performanceWeeks}
                onWeeks={setPerformanceWeeks}
                expandedHistory={expandedHistory}
                setExpandedHistory={setExpandedHistory}
                onOpenWorkout={id => { setHistoryOrigin("performance"); setExpandedHistory(id); window.scrollTo({ top: 0 }); }}
                onHistoryBack={() => { if (historyOrigin === "home") selectTab("home"); }}
                onEditWorkout={editWorkout}
                onDeleteWorkout={id => workoutsHook.deleteWorkout(id, { onError: setDataError })}
                onStartWorkout={startWorkout}
                filters={filters}
                setFilters={setFilters}
                today={weekly.today}
              />
            )}
            <div hidden={tab !== "templates"}>
              <TemplatesScreen
                templatesHook={templatesHook}
                libraryHook={libraryHook}
                onStartFromTemplate={startFromTemplate}
                onError={setDataError}
              />
            </div>
            {tab === "week" && (
              <WeekSetupScreen weekly={weekly} templates={templates} onClose={() => selectTab("home")} onGoToTemplates={() => selectTab("templates")} />
            )}
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
            tab={tab === "week" ? "home" : tab}
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
            setPerformanceView("history");
            setPerformanceExercise(null);
            setHistoryOrigin("performance");
            setTab("performance");
          }}
        />
      )}
      {selectedWeekRow && tab === "home" && (
        <PlannedSessionDrawer row={selectedWeekRow} weekly={weekly} workouts={workouts}
          onClose={() => setSelectedWeekDay(null)} onStart={startPlanned} onEdit={openWeek}
          onHistory={id => { setTab("performance"); setPerformanceView("history"); setHistoryOrigin("home"); setPerformanceExercise(null); setExpandedHistory(id); }} />
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
