import { describe, it, expect } from 'vitest';
import { liveEntry, replaceLiveEntry, replaceTemplateEntry, planFromEntry } from './exercisePlan';
const single = { kind: 'single', name: 'Squat', nameA: 'Squat', count: 3, rest: 90, targets: ['10', '8', '6'] };
describe('exercise plans', () => {
  it('keeps targets separate from performed reps and preserves rest', () => {
    const ex = liveEntry(single);
    expect(ex.rest).toBe(90);
    expect(ex.sets.map(s => s.target)).toEqual(['10', '8', '6']);
    expect(ex.sets.every(s => s.reps === '' && s.done === false)).toBe(true);
  });
  it('converts single to superset without losing recorded values', () => {
    const previous = liveEntry(single); previous.sets[0] = { weight: '80', reps: '10', done: true, target: '10' };
    const [pair] = replaceLiveEntry(previous, { ...single, kind: 'superset', nameB: 'Row', restA: 0, restB: 120 });
    expect(pair.sets[0]).toMatchObject({ weightA: '80', repsA: '10', doneA: true, weightB: '', repsB: '' });
    expect(pair.restA).toBe(0);
  });
  it('dissociates a superset while preserving BOTH exercise histories', () => {
    const pair = liveEntry({ ...single, kind: 'superset', nameB: 'Row', restA: 30, restB: 120, targetsB: ['8', '8', '8'] });
    pair.sets[0].weightB = '45'; pair.sets[0].repsB = '8';
    const [a, b] = replaceLiveEntry(pair, single);
    expect(a.name).toBe('Squat'); expect(b.name).toBe('Row'); expect(b.rest).toBe(120);
    expect(b.sets[0]).toMatchObject({ weight: '45', reps: '8', target: '8' });
    expect(b.id).not.toBe(a.id);
  });
  it('retains second template exercise when leaving superset mode', () => {
    const [a, b] = replaceTemplateEntry({ pair: ['Squat', 'Row'], sets: 3, restB: 90, targetsB: ['6'] }, single);
    expect(a.sets).toBe(3); expect(b).toMatchObject({ name: 'Row', targets: ['6'], rest: 90 });
  });
  it('does not carry a logged set onto a different exercise swapped in via the edit drawer', () => {
    const previous = liveEntry(single);
    previous.sets[0] = { weight: '80', reps: '10', done: true, target: '10' };
    const swapped = liveEntry({ kind: 'single', name: 'Deadlift', nameA: 'Deadlift', count: 3, rest: 90, targets: [] }, previous);
    expect(swapped.sets[0]).toMatchObject({ weight: '', reps: '', done: false });
  });
  it('does not carry a logged set onto a different exercise swapped into one side of a superset', () => {
    const previous = liveEntry({ ...single, kind: 'superset', nameB: 'Row' });
    previous.sets[0] = { weightA: '80', repsA: '10', doneA: true, weightB: '45', repsB: '8', doneB: true };
    const swapped = liveEntry({ ...single, kind: 'superset', nameA: 'Squat', nameB: 'Curl' }, previous);
    expect(swapped.sets[0]).toMatchObject({ weightA: '80', repsA: '10', doneA: true, weightB: '', repsB: '', doneB: false });
  });
  it('loads older templates with no rep targets and does not mutate them', () => {
    const old = { name: 'Squat', sets: 3, rest: 120 };
    const plan = planFromEntry(old); plan.targets.push('8');
    expect(old.targets).toBeUndefined(); expect(plan.rest).toBe(120);
  });
});
