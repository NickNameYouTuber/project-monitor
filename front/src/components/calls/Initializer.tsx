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
      if (mic) mic.checked = pre.camEnabled !== false; // cam+mic чекбокс (по умолчанию true)
      if (screen) screen.checked = false;
      if (roomInput) roomInput.value = roomId;
      setTimeout(() => { joinBtn?.click(); }, 0);
      // Применяем состояния микрофона и камеры ПОСЛЕ включения (программно)
      setTimeout(() => {
        try {
          (window as any).callSetMedia?.({ mic: pre.micEnabled !== false, cam: pre.camEnabled !== false });
        } catch {}
      }, 600);
    }
    const leaveBtn = document.getElementById('ctrlLeave') as HTMLButtonElement | null;
    if (leaveBtn) {
      leaveBtn.onclick = onLeave;
    }
  }, [roomId, onLeave]);
  return null;
}


