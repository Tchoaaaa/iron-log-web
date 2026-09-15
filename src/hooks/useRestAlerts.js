import { useEffect, useRef } from 'react';
import { createRestAlertPlayer, watchRestAlerts } from '../lib/restAlerts';

// Lives with the session, so moving between app screens keeps alerts active.
// No React state on each tick: the rest clock does not re-render the app shell.
export function useRestAlerts(active, enabled) {
  const player = useRef(null);
  useEffect(() => {
    if (!enabled) return;
    const audio = createRestAlertPlayer();
    player.current = audio;
    document.addEventListener('pointerdown', audio.unlock, true);
    document.addEventListener('keydown', audio.unlock, true);
    document.addEventListener('click', audio.unlock, true);
    return () => {
      document.removeEventListener('pointerdown', audio.unlock, true);
      document.removeEventListener('keydown', audio.unlock, true);
      document.removeEventListener('click', audio.unlock, true);
      audio.dispose();
      player.current = null;
    };
  }, [enabled]);
  const timer = active?.restTimer;
  const paused = active?.pausedAt != null;
  const editing = !!active?.editId;
  useEffect(() => {
    if (!enabled || !timer || paused || editing) return;
    const cancel = watchRestAlerts(timer, (kind) => player.current?.play(kind));
    return () => { cancel(); player.current?.stop(); };
  }, [enabled, timer, paused, editing]);
}
