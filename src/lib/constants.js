export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export const REST_OPTIONS = [30, 45, 60, 90, 120, 150, 180, 210, 240, 270, 300];

// n°/✓ | KG | REPS
export const SET_GRID = "30px minmax(0, 0.92fr) minmax(0, 0.92fr)";
