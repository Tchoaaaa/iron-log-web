import HistoryScreen from "./HistoryScreen";
import PRScreen from "./PRScreen";
import PerformanceOverview from "./PerformanceOverview";
import ExercisePerformanceScreen from "./ExercisePerformanceScreen";

const views = [
  ["overview", "Aperçu"],
  ["history", "Historique"],
  ["records", "Records"],
];
export default function PerformanceScreen({
  workouts,
  exercises,
  recordMuscle,
  onRecordMuscle,
  view,
  onView,
  period,
  onPeriod,
  exercise,
  onExercise,
  expandedHistory,
  setExpandedHistory,
  onHistoryBack,
  onOpenWorkout,
  onEditWorkout,
  onDeleteWorkout,
  onStartWorkout,
  filters,
  setFilters,
  today,
  weeks,
  onWeeks,
}) {
  if (expandedHistory)
    return (
      <HistoryScreen
        workouts={workouts}
        expandedHistory={expandedHistory}
        setExpandedHistory={setExpandedHistory}
        onEditWorkout={onEditWorkout}
        onDeleteWorkout={onDeleteWorkout}
        onStartWorkout={onStartWorkout}
        filters={filters}
        setFilters={setFilters}
        onBack={onHistoryBack}
      />
    );
  if (exercise)
    return (
      <ExercisePerformanceScreen
        key={exercise}
        name={exercise}
        workouts={workouts}
        today={today}
        weeks={weeks}
        onWeeks={onWeeks}
        onBack={() => onExercise(null)}
        onWorkout={onOpenWorkout}
      />
    );
  return (
    <section>
      <h1 className="page-title mb-5">Performance</h1>
      <div
        className="performance-tabs"
        role="tablist"
        aria-label="Sections de Performance"
      >
        {views.map(([key, label], index) => (
          <button
            role="tab"
            id={`performance-tab-${key}`}
            aria-controls={`performance-panel-${key}`}
            aria-selected={view === key}
            tabIndex={view === key ? 0 : -1}
            key={key}
            onClick={() => onView(key)}
            onKeyDown={(e) => {
              let next;
              if (e.key === "ArrowRight") next = (index + 1) % views.length;
              if (e.key === "ArrowLeft")
                next = (index + views.length - 1) % views.length;
              if (e.key === "Home") next = 0;
              if (e.key === "End") next = views.length - 1;
              if (next !== undefined) {
                e.preventDefault();
                onView(views[next][0]);
                document
                  .getElementById(`performance-tab-${views[next][0]}`)
                  .focus();
              }
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div
        id={`performance-panel-${view}`}
        role="tabpanel"
        aria-labelledby={`performance-tab-${view}`}
        tabIndex={0}
        className="performance-panel"
      >
        {view === "overview" && (
          <PerformanceOverview
            workouts={workouts}
            period={period}
            onPeriod={onPeriod}
            onExercise={onExercise}
            onRecords={() => onView("records")}
            onStartWorkout={onStartWorkout}
            today={today}
          />
        )}
        {view === "history" && (
          <HistoryScreen
            workouts={workouts}
            expandedHistory={null}
            setExpandedHistory={onOpenWorkout}
            onEditWorkout={onEditWorkout}
            onDeleteWorkout={onDeleteWorkout}
            onStartWorkout={onStartWorkout}
            filters={filters}
            setFilters={setFilters}
          />
        )}
        {view === "records" && (
          <PRScreen workouts={workouts} exercises={exercises} muscle={recordMuscle} onMuscle={onRecordMuscle} onExercise={onExercise} />
        )}
      </div>
    </section>
  );
}
