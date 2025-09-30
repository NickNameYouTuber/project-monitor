import { useEffect } from 'react';
import { initCallConnect } from '../../utils/call-connect';
import { getCurrentUser } from '../../api/users';

export default function Initializer({ roomId, onLeave }: { roomId?: string; onLeave: () => void }) {
  useEffect(() => {
    (async () => {
      try {
        const me = await getCurrentUser();
        (window as any).currentUserDisplayName = me.displayName || me.username || '';
        (window as any).currentUserName = me.username || '';
      } catch {}
    })();

    initCallConnect();
    if (roomId) {
      const roomInput = document.getElementById('roomId') as HTMLInputElement | null;
      const joinBtn = document.getElementById('joinRoom') as HTMLButtonElement | null;
      const mic = document.getElementById('shareCamera') as HTMLInputElement | null;
      const screen = document.getElementById('shareScreen') as HTMLInputElement | null;
      // Применяем настройки из pre-join
      let pre: any = (window as any).prejoinSettings || {};
      if (mic) mic.checked = !!pre.camEnabled; // cam+mic чекбокс
      if (screen) screen.checked = false;
      if (roomInput) roomInput.value = roomId;
      setTimeout(() => { joinBtn?.click(); }, 0);
      // Применяем mute без камеры
      if (typeof pre.micEnabled === 'boolean') {
        setTimeout(() => {
          const ctrlMic = document.getElementById('ctrlMic') as HTMLButtonElement | null;
          if (ctrlMic && !pre.micEnabled) ctrlMic.click();
        }, 300);
      }
      if (typeof pre.camEnabled === 'boolean') {
        setTimeout(() => {
          const ctrlCam = document.getElementById('ctrlCam') as HTMLButtonElement | null;
          if (ctrlCam && !pre.camEnabled) ctrlCam.click();
        }, 400);
      }
    }
    const leaveBtn = document.getElementById('ctrlLeave') as HTMLButtonElement | null;
    if (leaveBtn) {
      leaveBtn.onclick = onLeave;
    }
  }, [roomId, onLeave]);
  return null;
}


