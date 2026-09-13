import { describe, it, expect } from 'vitest';
import { elapsedSessionMs, toggleSessionPause, restRemainingMs, validSet } from './sessionTimer';
describe('session clock', () => {
  it('recovers elapsed time after backgrounding without depending on interval ticks', () => expect(elapsedSessionMs({ startedAt: 1000 }, 181000)).toBe(180000));
  it('excludes paused time across a persisted reload and multiple pauses', () => {
    let session = toggleSessionPause({ startedAt: 1000 }, 61000);
    expect(elapsedSessionMs(JSON.parse(JSON.stringify(session)), 121000)).toBe(60000);
    session = toggleSessionPause(session, 121000);
    expect(elapsedSessionMs(session, 181000)).toBe(120000);
    session = toggleSessionPause(session, 181000);
    session = toggleSessionPause(session, 241000);
    expect(elapsedSessionMs(session, 301000)).toBe(180000);
  });
  it('does not run clocks for historic edits', () => expect(elapsedSessionMs({ editId: 'a', originalDurationMin: 42 }, Date.now())).toBe(2520000));
  it('rejects incomplete, negative and fractional repetition sets but accepts bodyweight', () => {
    expect(validSet('0', '12')).toBe(true);
    for (const values of [['', '5'], ['20', ''], ['-10', '8'], ['20', '1.5'], ['10', '0'], ['Infinity', '8']]) expect(validSet(...values)).toBe(false);
  });
  it('counts down a rest timer normally while the session is not paused', () => {
    const active = { startedAt: 0, restTimer: { endsAt: 10000, seconds: 10, label: 'Repos' } };
    expect(restRemainingMs(active, 4000)).toBe(6000);
    expect(restRemainingMs(active, 15000)).toBe(0);
  });
  it('freezes the rest countdown at the moment the session is paused, ignoring real time passing', () => {
    const active = { startedAt: 0, restTimer: { endsAt: 10000, seconds: 10, label: 'Repos' }, pausedAt: 4000 };
    expect(restRemainingMs(active, 4000)).toBe(6000);
    expect(restRemainingMs(active, 25000)).toBe(6000);
  });
  it('returns 0 when there is no rest timer running', () => {
    expect(restRemainingMs({ startedAt: 0 }, 1000)).toBe(0);
    expect(restRemainingMs(null, 1000)).toBe(0);
  });
});
