import { describe, it, expect } from 'vitest';
import { filterWorkouts, EMPTY_FILTERS } from './historyFilters';
const workouts = [
  { id: 1, date: new Date('2026-09-10T00:00:00').getTime(), name: null, exercises: [] },
  { id: 2, date: new Date('2026-09-10T23:59:59.999').getTime(), name: 'Push', exercises: [{ superset: 'x' }] },
  { id: 3, date: new Date('2026-09-11T00:00:00').getTime(), name: 'Legs', exercises: [] },
];
describe('history filters', () => {
  it('includes the entire local end date', () => expect(filterWorkouts(workouts, { ...EMPTY_FILTERS, from: '2026-09-10', to: '2026-09-10' }).map(w => w.id)).toEqual([1, 2]));
  it('combines name, type and dates', () => expect(filterWorkouts(workouts, { ...EMPTY_FILTERS, name: 'Push', type: 'superset', to: '2026-09-10' }).map(w => w.id)).toEqual([2]));
  it('distinguishes free sessions and empty filtered results', () => {
    expect(filterWorkouts(workouts, { ...EMPTY_FILTERS, type: 'free' }).map(w => w.id)).toEqual([1]);
    expect(filterWorkouts(workouts, { ...EMPTY_FILTERS, from: '2027-01-01' })).toEqual([]);
  });
});
