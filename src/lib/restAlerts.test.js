import { afterEach, describe, expect, it, vi } from 'vitest';
import { restAlertCues, watchRestAlerts, createRestAlertPlayer } from './restAlerts';
import { toggleSessionPause, restRemainingMs } from './sessionTimer';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
const timer = (seconds) => ({ seconds, endsAt: seconds * 1000 });
function observe(seconds, now = 0) {
  vi.useFakeTimers(); vi.setSystemTime(now);
  const emit = vi.fn();
  const stop = watchRestAlerts(timer(seconds), emit);
  return { emit, stop };
}
describe('rest alerts', () => {
  it('beeps at elapsed 30 and 60 seconds, then remaining 3, 2, 1, and finishes once', () => {
    const { emit } = observe(90);
    vi.advanceTimersByTime(29900); expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100); expect(emit.mock.calls).toEqual([['interval']]);
    vi.advanceTimersByTime(57000); expect(emit.mock.calls).toEqual([['interval'], ['interval'], ['countdown']]);
    vi.advanceTimersByTime(2000); expect(emit.mock.calls.slice(-2)).toEqual([['countdown'], ['countdown']]);
    vi.advanceTimersByTime(1000); expect(emit).toHaveBeenLastCalledWith('finish');
    vi.advanceTimersByTime(90000); expect(emit).toHaveBeenCalledTimes(6);
  });
  it('counts elapsed time for a 45 second rest and avoids duplicate cues at 30 seconds', () => {
    expect(restAlertCues(45)).toEqual([[30000,'interval'],[42000,'countdown'],[43000,'countdown'],[44000,'countdown'],[45000,'finish']]);
    expect(restAlertCues(33).filter(([at]) => at === 30000)).toEqual([[30000, 'countdown']]);
  });
  it('handles short rests and invalid durations', () => {
    const { emit } = observe(3);
    expect(emit).toHaveBeenLastCalledWith('countdown');
    vi.advanceTimersByTime(3000); expect(emit).toHaveBeenCalledTimes(4);
    expect(restAlertCues(0)).toEqual([]); expect(restAlertCues(NaN)).toEqual([]);
  });
  it('cancels all future cues when stopped or disabled', () => {
    const { emit, stop } = observe(90);
    vi.advanceTimersByTime(30000); stop(); vi.advanceTimersByTime(100000);
    expect(emit).toHaveBeenCalledTimes(1);
  });
  it('does not replay old cues on reload or a long suspension', () => {
    const { emit } = observe(90, 65000);
    expect(emit).not.toHaveBeenCalled();
    vi.setSystemTime(95000); vi.advanceTimersByTime(100);
    expect(emit).not.toHaveBeenCalled();
  });
  it('emits only the current cue after missed ticks', () => {
    const { emit } = observe(90);
    vi.setSystemTime(88200); vi.advanceTimersByTime(100);
    expect(emit.mock.calls).toEqual([['countdown']]);
  });
  it('preserves remaining rest and alert schedule through pause and resume', () => {
    let active = { startedAt: 0, restTimer: timer(90) };
    active = toggleSessionPause(active, 30000);
    expect(restRemainingMs(active, 150000)).toBe(60000);
    active = toggleSessionPause(active, 150000);
    expect(restRemainingMs(active, 150000)).toBe(60000);
    expect(active.restTimer.endsAt).toBe(210000);
  });
  it('still vibrates once at completion when audio is unavailable', () => {
    const vibrate = vi.fn(); vi.stubGlobal('navigator', { vibrate });
    const player = createRestAlertPlayer(); player.unlock();
    player.play('interval'); player.play('countdown');
    expect(vibrate).not.toHaveBeenCalled();
    player.play('finish'); expect(vibrate).toHaveBeenCalledWith([200,100,200]);
    player.dispose(); expect(vibrate).toHaveBeenLastCalledWith(0);
  });
  it('survives unavailable vibration hardware', () => {
    vi.stubGlobal('navigator', {});
    expect(() => { const player = createRestAlertPlayer(); player.play('finish'); player.dispose(); }).not.toThrow();
  });
});
