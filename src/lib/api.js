import { supabase } from "./supabaseClient";

// ---------------------------------------------------------------------------
// All reads/writes below are scoped to the signed-in user by Row Level
// Security in the database (see supabase-schema.sql). `user_id` columns
// default to auth.uid() server-side, so the client never sets them and a
// user physically cannot read or write another user's rows.
//
// The per-user reads ALSO filter by user_id explicitly. Admins are granted a
// wider SELECT by RLS (for the dashboard), and this keeps their *own* app
// view scoped to just their data.
// ---------------------------------------------------------------------------

async function requireUserId() {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id ?? null;
  if (!id) throw new Error("Not authenticated");
  return id;
}

// ---------- auth ----------
export async function signUp({ email, password, displayName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: (displayName || "").trim() } },
  });
  if (error) throw error;
  // If email confirmation is enabled, data.session is null until confirmed.
  return { needsConfirmation: !data.session, session: data.session };
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ---------- profile ----------
// `age` / `weight_kg` / `height_cm` were added after the first release. The
// helpers below still work if that migration hasn't run yet (see
// supabase-schema.sql): reads use select("*"), and a write that mentions a
// missing column is retried without the body-metrics fields.
const MISSING_METRIC_COL = (error) =>
  !!error &&
  /(age|weight_kg|height_cm|daily_steps)/i.test(error.message || "") &&
  /(column|schema cache|does not exist|could not find)/i.test(error.message || "");

export async function getProfile() {
  const id = await requireUserId();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  const id = await requireUserId();
  const body = { ...patch, updated_at: new Date().toISOString() };
  let { error } = await supabase.from("profiles").update(body).eq("id", id);
  if (MISSING_METRIC_COL(error)) {
    // body-metrics columns not migrated yet — save everything else
    const { age, weight_kg, height_cm, daily_steps, ...rest } = body;
    ({ error } = await supabase.from("profiles").update(rest).eq("id", id));
  }
  if (error) throw error;
}

// ---------- exercise library ----------
export async function listExercisesOrSeed(defaults) {
  const uidval = await requireUserId();
  const { data, error } = await supabase
    .from("exercises")
    .select("name, category")
    .eq("user_id", uidval)
    .order("name", { ascending: true });
  if (error) throw error;
  if (data.length > 0) return data;

  // First run for this account: seed the default library.
  const rows = defaults.map((e) => ({ name: e.name, category: e.category }));
  const { data: seeded, error: seedErr } = await supabase
    .from("exercises")
    .insert(rows)
    .select("name, category");
  if (seedErr) {
    // Seeding is best-effort; fall back to the in-memory defaults.
    return defaults;
  }
  return seeded;
}

export async function addExercise({ name, category }) {
  const { error } = await supabase
    .from("exercises")
    .insert({ name, category: category || "Perso" });
  // Ignore unique-violation: the exercise already exists for this user.
  if (error && error.code !== "23505") throw error;
}

// ---------- templates ----------
export async function listTemplates() {
  const uidval = await requireUserId();
  const { data, error } = await supabase
    .from("templates")
    .select("id, name, exercises")
    .eq("user_id", uidval)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveTemplate({ id, name, exercises }) {
  if (id) {
    const { data, error } = await supabase
      .from("templates")
      .update({ name, exercises, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, name, exercises")
      .single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from("templates")
    .insert({ name, exercises })
    .select("id, name, exercises")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("templates").delete().eq("id", id);
  if (error) throw error;
}

// ---------- workouts ----------
function volumeOf(exercises) {
  return exercises.reduce(
    (sum, e) => sum + e.sets.reduce((s, set) => s + Number(set.weight) * Number(set.reps), 0),
    0
  );
}
function setCountOf(exercises) {
  return exercises.reduce((sum, e) => sum + e.sets.length, 0);
}

function rowToWorkout(r) {
  return {
    id: r.id,
    name: r.name ?? null,
    date: new Date(r.performed_at).getTime(),
    durationMin: r.duration_min,
    exercises: r.exercises || [],
  };
}

const MISSING_NAME_COL = (error) =>
  !!error &&
  /name/i.test(error.message || "") &&
  /(column|schema cache|does not exist)/i.test(error.message || "");

export async function listWorkouts() {
  const uidval = await requireUserId();
  // select("*") so it works whether or not the `name` column has been migrated
  const { data, error } = await supabase
    .from("workouts")
    .select("*")
    .eq("user_id", uidval)
    .order("performed_at", { ascending: false });
  if (error) throw error;
  return data.map(rowToWorkout);
}

export async function insertWorkout({ date, durationMin, exercises, name }) {
  const base = {
    performed_at: new Date(date).toISOString(),
    duration_min: durationMin,
    exercises,
    exercise_count: exercises.length,
    set_count: setCountOf(exercises),
    total_volume: volumeOf(exercises),
  };
  let res = await supabase
    .from("workouts")
    .insert({ ...base, name: name ?? null })
    .select("*")
    .single();
  if (MISSING_NAME_COL(res.error)) {
    // `name` column not migrated yet — save without it
    res = await supabase.from("workouts").insert(base).select("*").single();
  }
  if (res.error) throw res.error;
  return rowToWorkout(res.data);
}

export async function updateWorkout(id, { name, exercises }) {
  const patch = {
    exercises,
    exercise_count: exercises.length,
    set_count: setCountOf(exercises),
    total_volume: volumeOf(exercises),
  };
  let res = await supabase
    .from("workouts")
    .update({ ...patch, name: name ?? null })
    .eq("id", id)
    .select("*")
    .single();
  if (MISSING_NAME_COL(res.error)) {
    res = await supabase.from("workouts").update(patch).eq("id", id).select("*").single();
  }
  if (res.error) throw res.error;
  return rowToWorkout(res.data);
}

export async function deleteWorkout(id) {
  const { error } = await supabase.from("workouts").delete().eq("id", id);
  if (error) throw error;
}

// ---------- admin ----------
// `checkIsAdmin` reads the caller's own row in `admins` (allowed by RLS).
// The real enforcement is server-side: the admin_* RPCs below raise
// "not authorized" for non-admins, and RLS blocks cross-user table reads.
export async function checkIsAdmin() {
  let id;
  try {
    id = await requireUserId();
  } catch {
    return false;
  }
  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function adminOverview() {
  const { data, error } = await supabase.rpc("admin_overview");
  if (error) throw error;
  return Array.isArray(data) ? data[0] : data;
}

export async function adminUserStats() {
  const { data, error } = await supabase.rpc("admin_user_stats");
  if (error) throw error;
  return data || [];
}
