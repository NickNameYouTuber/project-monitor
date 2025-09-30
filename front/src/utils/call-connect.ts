/* eslint-disable */
// NOTE: Порт перенесён из public/call.html. Этот модуль связывает DOM-элементы и логику сигналинга/RTC.
import { io } from 'socket.io-client';

export function initCallConnect(options?: { socketPath?: string; turnServers?: { urls: string; username?: string; credential?: string }[] }) {
  if ((window as any).__callConnectInit) {
    try { console.warn('[CALL] initCallConnect skipped: already initialized'); } catch {}
    return;
  }
  (window as any).__callConnectInit = true;
  const localCamera = document.getElementById('localCamera') as HTMLVideoElement | null;
  const localScreen = document.getElementById('localScreen') as HTMLVideoElement | null;
  const shareCameraCheckbox = document.getElementById('shareCamera') as HTMLInputElement | null;
  const shareScreenCheckbox = document.getElementById('shareScreen') as HTMLInputElement | null;
  const roomIdInput = document.getElementById('roomId') as HTMLInputElement | null;
  const remotesContainer = document.getElementById('remotes') as HTMLElement | null;
  const statusDiv = document.getElementById('status') as HTMLElement | null;
  const startBtn = document.getElementById('startLocal');
  const joinBtn = document.getElementById('joinRoom');

  if (!remotesContainer) throw new Error('remotes container not found');

  let localStream: MediaStream | null = null;
  let roomJoined = false;
  let micEnabled = false;
  let camEnabled = false;
  let screenEnabled = false;
  let cameraStream: MediaStream | null = null;
  let screenStream: MediaStream | null = null;
  const peerNames: Record<string, string> = {};
  const voiceAnalyzers: Record<string, { ctx: AudioContext; analyser: AnalyserNode; rafId?: number }> = {};

  function emitLocalStatus() {
    try {
      window.dispatchEvent(new CustomEvent('call:localStatus', { detail: { micEnabled, camEnabled, screenEnabled } }));
    } catch {}
  }

  function emitScreenActive(active: boolean) {
    try {
      window.dispatchEvent(new CustomEvent('call:screenActive', { detail: { active } }));
    } catch {}
    try { updateLayoutForScreen(active); } catch {}
  }

  // Socket.IO
  const socket = io('/', { path: options?.socketPath ?? '/socket.io' });
  const peers: Record<string, RTCPeerConnection> = {};
  const participantsContainer = remotesContainer; // 3x2 grid
  let currentRoomId: string | null = null;
  const peerScreenState: Record<string, boolean> = {};

  function updateLayoutForScreen(active: boolean) {
    const activeScreenContainer = document.getElementById('activeScreenContainer') as HTMLElement | null;
    const remotesContainer = document.getElementById('remotesContainer') as HTMLElement | null;
    const remotesEl = document.getElementById('remotes') as HTMLElement | null;
    if (!remotesEl || !remotesContainer) return;
    
    if (active) {
      // Показать верхний контейнер экрана
      if (activeScreenContainer) {
        activeScreenContainer.classList.remove('hidden');
        // Экран занимает flex-1, участники тоже flex-1, делим пространство
      }
      
      // Контейнер участников становится фиксированной высоты (меньше чем раньше)
      remotesContainer.style.flex = '0 0 auto';
      remotesContainer.style.height = '16vh'; // Уменьшили в 1.5 раза (было 25vh)
      
      // Делаем горизонтальную прокручиваемую полосу
      remotesEl.className = 'h-full flex flex-nowrap justify-start items-center gap-2 overflow-x-auto overflow-y-hidden';
      
      // Каждая плитка участника в горизонтальном режиме - прямоугольная как в сетке
      const tiles = remotesEl.querySelectorAll('[id^="peer-"]');
      tiles.forEach((tile) => {
        (tile as HTMLElement).style.flexShrink = '0';
        (tile as HTMLElement).style.height = '100%';
        (tile as HTMLElement).style.aspectRatio = '16/9'; // Прямоугольная как в сетке
        (tile as HTMLElement).style.width = 'auto';
        (tile as HTMLElement).style.maxWidth = 'none';
      });
    } else {
      // Спрятать верхний контейнер экрана
      if (activeScreenContainer) activeScreenContainer.classList.add('hidden');
      
      // Контейнер участников занимает всё доступное пространство
      remotesContainer.style.flex = '';
      remotesContainer.style.height = '';
      
      // Включить адаптивную сетку по высоте
      remotesEl.className = 'h-full grid gap-2 auto-rows-fr';
      
      // Убираем inline стили для сеточного режима
      const tiles = remotesEl.querySelectorAll('[id^="peer-"]');
      tiles.forEach((tile) => {
        (tile as HTMLElement).style.flexShrink = '';
        (tile as HTMLElement).style.height = '';
        (tile as HTMLElement).style.aspectRatio = '';
        (tile as HTMLElement).style.width = '';
        (tile as HTMLElement).style.maxWidth = '';
      });
    }
    // Обновляем колонки в зависимости от количества участников
    updateGridColumns();
  }

  function setTileName(peerId: string, name: string | null) {
    const el = document.getElementById('name-' + peerId);
    if (el) {
      el.textContent = name || (peerId === 'me' ? 'You' : peerId);
    }
  }

  function setNameVisible(peerId: string, visible: boolean) {
    const el = document.getElementById('name-' + peerId);
    if (!el) return;
    if (visible) el.classList.remove('hidden'); else el.classList.add('hidden');
  }

  function updateGridColumns() {
    const remotesEl = document.getElementById('remotes') as HTMLElement | null;
    if (!remotesEl) return;
    
    const participantCount = remotesEl.children.length;
    if (participantCount === 0) return;
    
    // Определяем оптимальную сетку в зависимости от количества участников
    let columns: number;
    if (participantCount <= 2) columns = participantCount;
    else if (participantCount <= 4) columns = 2;
    else if (participantCount <= 6) columns = 3;
    else if (participantCount <= 9) columns = 3;
    else columns = 4;
    
    remotesEl.style.gridTemplateColumns = `repeat(${columns}, 1fr)`;
  }

  function ensurePeerTile(peerId: string) {
    if (!participantsContainer) return;
    let peerDiv = document.getElementById('peer-' + peerId) as HTMLElement | null;
    if (!peerDiv) {
      peerDiv = document.createElement('div');
      peerDiv.id = 'peer-' + peerId;
      peerDiv.className = 'rounded-xl overflow-hidden ring-1 ring-[#2A2D32] bg-[#16171A] w-full h-full relative flex items-center justify-center';
      peerDiv.innerHTML = `
        <video id="remote-vid1-${peerId}" autoplay playsinline class="absolute inset-0 w-full h-full object-cover bg-black hidden"></video>
        <div id="placeholder-${peerId}" class="text-[#AAB0B6] text-xs">${peerId === 'me' ? 'You' : peerId}</div>
        <div class="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-xs hidden" id="name-${peerId}">${peerNames[peerId] || (peerId === 'me' ? 'You' : peerId)}</div>
        <div id="voice-${peerId}" class="pointer-events-none absolute inset-0 ring-2 ring-emerald-500 rounded-xl hidden"></div>
      `;
      participantsContainer.appendChild(peerDiv);
      try { console.log('[CALL] tile created for', peerId); } catch {}
      // Обновляем сетку при добавлении участника
      updateGridColumns();
    }
    return peerDiv;
  }

  function safePlay(videoEl: HTMLVideoElement | null) {
    if (!videoEl) return;
    const p: any = videoEl.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  }

  // Маркируем треки по источнику
  function markTrackSource(track: MediaStreamTrack, source: 'camera' | 'screen' | 'audio') {
    // Добавляем метку к треку
    (track as any)._source = source;
    console.log(`[CALL] marked track ${track.kind} as ${source} (label: ${track.label})`);
  }

  function getTrackSource(track: MediaStreamTrack): 'camera' | 'screen' | 'audio' | 'unknown' {
    // Проверяем метку
    const source = (track as any)._source;
    if (source) return source;
    
    // Fallback: определяем по метке
    const label = (track.label || '').toLowerCase();
    if (track.kind === 'audio') return 'audio';
    if (label.includes('screen') || label.includes('display') || label.includes('window') || label.includes('monitor')) {
      return 'screen';
    }
    // По умолчанию не считаем неизвестное видео камерой, чтобы не путать экран
    return 'unknown';
  }

  // Пересобираем localStream из доступных потоков (как в call.html)
  async function rebuildLocalStream() {
    console.log('[CALL] rebuilding localStream, cameraStream:', !!cameraStream, 'screenStream:', !!screenStream);
    
    const oldStream = localStream;
    const allTracks: MediaStreamTrack[] = [];
    
    // Добавляем треки с маркировкой
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => {
        markTrackSource(track, track.kind === 'audio' ? 'audio' : 'camera');
        allTracks.push(track);
      });
    }
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => {
        markTrackSource(track, 'screen');
        allTracks.push(track);
      });
    }
    
    localStream = new MediaStream(allTracks);
    
    console.log('[CALL] new localStream tracks:', localStream.getTracks().map(t => `${t.kind}(${t.label}) [${getTrackSource(t)}]`));
    
    // Обновляем локальные превью
    updateLocalPreviews();
    
    // Заменяем треки во всех пирах
    for (const [peerId, pc] of Object.entries(peers)) {
      await replaceTracksInPeer(pc, oldStream, localStream);
    }
    
    attachLocalToPeersAndRenegotiate();
  }

  function updateLocalPreviews() {
    // Обновляем превью камеры
    try {
      ensurePeerTile('me');
      const selfVideo = document.getElementById('remote-vid1-me') as HTMLVideoElement | null;
      if (selfVideo) {
        if (cameraStream) {
          selfVideo.srcObject = cameraStream;
          selfVideo.muted = true;
          safePlay(selfVideo);
          try { selfVideo.classList.remove('hidden'); (selfVideo as any).style.display = 'block'; } catch {}
          const placeholder = document.getElementById('placeholder-me');
          if (placeholder) placeholder.classList.add('hidden');
          // Показать ник при включённой камере
          try { setNameVisible('me', true); } catch {}
        } else {
          selfVideo.srcObject = new MediaStream();
          const placeholder = document.getElementById('placeholder-me');
          if (placeholder) placeholder.classList.remove('hidden');
          // Скрыть ник при выключенной камере
          try { setNameVisible('me', false); } catch {}
        }
      }
    } catch {}

    // Обновляем превью экрана
    try {
      const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
      if (activeScreenEl) {
        if (screenStream) {
          activeScreenEl.srcObject = screenStream;
          safePlay(activeScreenEl);
          console.log('[CALL] local screen preview updated');
        } else {
          activeScreenEl.srcObject = new MediaStream();
        }
      }
    } catch {}
  }

  async function replaceTracksInPeer(pc: RTCPeerConnection, oldStream: MediaStream | null, newStream: MediaStream) {
    const senders = pc.getSenders();
    const newTracks = newStream.getTracks();
    
    // Группируем треки по типу
    const newAudioTracks = newTracks.filter(t => t.kind === 'audio');
    const newVideoTracks = newTracks.filter(t => t.kind === 'video');
    
    // Обрабатываем аудио (может быть только один)
    const audioSender = senders.find(s => s.track && s.track.kind === 'audio');
    if (newAudioTracks.length > 0) {
      if (audioSender) {
        try {
          await audioSender.replaceTrack(newAudioTracks[0]);
          console.log(`[CALL] replaced audio track (${newAudioTracks[0].label})`);
        } catch (e) {
          console.warn(`[CALL] failed to replace audio track:`, e);
        }
      } else {
        try {
          pc.addTrack(newAudioTracks[0], newStream);
          console.log(`[CALL] added new audio track (${newAudioTracks[0].label})`);
        } catch (e) {
          console.warn(`[CALL] failed to add audio track:`, e);
        }
      }
    } else if (audioSender) {
      // Удаляем аудио если его больше нет
      try {
        await audioSender.replaceTrack(null);
        console.log(`[CALL] cleared audio track`);
      } catch {}
    }
    
    // Обрабатываем видео (может быть несколько)
    const videoSenders = senders.filter(s => s.track && s.track.kind === 'video');
    
    // Заменяем/добавляем видео треки
    for (let i = 0; i < newVideoTracks.length; i++) {
      const track = newVideoTracks[i];
      
      if (i < videoSenders.length) {
        // Заменяем существующий sender
        try {
          await videoSenders[i].replaceTrack(track);
          console.log(`[CALL] replaced video track ${i} (${track.label})`);
        } catch (e) {
          console.warn(`[CALL] failed to replace video track ${i}:`, e);
        }
      } else {
        // Добавляем новый sender
        try {
          pc.addTrack(track, newStream);
          console.log(`[CALL] added new video track ${i} (${track.label})`);
        } catch (e) {
          console.warn(`[CALL] failed to add video track ${i}:`, e);
        }
      }
    }
    
    // Очищаем лишние видео senders (заменяем на null вместо удаления)
    for (let i = newVideoTracks.length; i < videoSenders.length; i++) {
      try {
        await videoSenders[i].replaceTrack(null);
        console.log(`[CALL] cleared video sender ${i}`);
      } catch {}
    }
  }

  async function attachLocalToPeersAndRenegotiate() {
    if (!localStream) return;
    for (const [peerId, pc] of Object.entries(peers)) {
      if (!pc) continue;
      // Гарантируем, что у нового пира есть приёмники для двух видео
      try { pc.addTransceiver('video', { direction: 'recvonly' }); } catch {}
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: peerId, offer: pc.localDescription });
      } catch {}
    }
  }

  function getSenderByKind(pc: RTCPeerConnection, kind: 'audio' | 'video') {
    return pc.getSenders().find((s) => s.track && s.track.kind === kind);
  }

  function getLocalTrack(kind: 'audio' | 'video'): MediaStreamTrack | null {
    if (!localStream) return null;
    if (kind === 'audio') return localStream.getAudioTracks()[0] || null;
    return localStream.getVideoTracks()[0] || null;
  }

  function removeLocalTrack(kind: 'audio' | 'video') {
    if (!localStream) return;
    const tracks = kind === 'audio' ? localStream.getAudioTracks() : localStream.getVideoTracks();
    tracks.forEach((t) => {
      try { t.stop(); } catch {}
      localStream!.removeTrack(t);
    });
  }

  async function setAudioEnabled(enable: boolean) {
    try { console.log('[CALL] mic toggle', enable); } catch {}
    if (enable) {
      if (!getLocalTrack('audio')) {
        const aud = await navigator.mediaDevices.getUserMedia({ audio: true });
        const aTrack = aud.getAudioTracks()[0];
        if (!localStream) localStream = new MediaStream();
        localStream.addTrack(aTrack);
      }
    } else {
      removeLocalTrack('audio');
    }
    for (const pc of Object.values(peers)) {
      const sender = getSenderByKind(pc, 'audio');
      const track = getLocalTrack('audio');
      if (sender) {
        await sender.replaceTrack(track || null);
      } else if (track) {
        try { pc.addTrack(track, localStream!); } catch {}
      }
    }
    await attachLocalToPeersAndRenegotiate();
    micEnabled = enable;
    // Детекция голоса и подсветка рамкой для "me"
    try {
      const tile = document.getElementById('peer-me');
      console.log('[CALL] voice detection setup: tile exists?', !!tile, 'micEnabled?', micEnabled, 'localStream?', !!localStream);
      if (tile && micEnabled && localStream && localStream.getAudioTracks().length > 0) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const stream = localStream;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        console.log('[CALL] voice detection loop started');
        let lastLog = 0;
        const loop = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (let i = 0; i < data.length; i++) {
            const v = (data[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / data.length);
          const now = Date.now();
          if (now - lastLog > 500) {
            console.log('[CALL] voice level:', rms.toFixed(3), 'threshold: 0.06', rms > 0.06 ? 'SPEAKING' : 'silent');
            lastLog = now;
          }
          const overlay = document.getElementById('voice-me') as HTMLElement | null;
          const rootTile = document.getElementById('peer-me') as HTMLElement | null;
          if (overlay) {
            if (rms > 0.06) overlay.classList.remove('hidden'); else overlay.classList.add('hidden');
          }
          if (rootTile) {
            if (rms > 0.06) {
              (rootTile as any).style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.9)';
            } else {
              (rootTile as any).style.boxShadow = '';
            }
          }
          if (micEnabled) requestAnimationFrame(loop);
        };
        loop();
      } else if (tile) {
        tile.classList.remove('ring-2', 'ring-emerald-500');
      }
    } catch (e) {
      console.error('[CALL] voice detection error:', e);
    }
    emitLocalStatus();
  }

  async function setCameraEnabled(enable: boolean) {
    try { console.log('[CALL] camera toggle', enable, 'current cameraStream:', !!cameraStream); } catch {}
    
    if (enable && !cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        console.log('[CALL] camera stream created');
        await rebuildLocalStream();
      } catch (e) {
        console.error('[CALL] failed to get camera:', e);
        return;
      }
    } else if (!enable && cameraStream) {
      console.log('[CALL] stopping camera stream');
      cameraStream.getTracks().forEach(t => { try { t.stop(); } catch {} });
      cameraStream = null;
      await rebuildLocalStream();
      
      // Очищаем локальное превью
      try {
        const selfVideo = document.getElementById('remote-vid1-me') as HTMLVideoElement | null;
        if (selfVideo) {
          selfVideo.srcObject = new MediaStream();
          selfVideo.classList.add('hidden');
          (selfVideo as any).style.display = 'none';
        }
        const placeholder = document.getElementById('placeholder-me');
        if (placeholder) placeholder.classList.remove('hidden');
        setNameVisible('me', false);
      } catch {}
      
      // Принудительно очистим видеосендёры (replaceTrack(null)), чтобы у собеседников пропала картинка
      try {
        for (const pc of Object.values(peers)) {
          const senders = pc.getSenders().filter(s => s.track && s.track.kind === 'video');
          // Если видеотрека нет вообще — очистим все видео-сендёры
          if (!cameraStream && !screenStream) {
            for (const s of senders) {
              try { await s.replaceTrack(null); } catch {}
            }
          }
        }
      } catch {}
    }
    
    camEnabled = enable;
    emitLocalStatus();
  }

  async function setScreenEnabled(enable: boolean) {
    try { console.log('[CALL] screen toggle', enable, 'current screenStream:', !!screenStream); } catch {}
    
    if (enable && !screenStream) {
      try {
        // @ts-ignore
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStream.getVideoTracks()[0].onended = () => { setScreenEnabled(false); };
        console.log('[CALL] screen stream created');
        await rebuildLocalStream();
      } catch (e) {
        console.error('[CALL] failed to get screen:', e);
        return;
      }
    } else if (!enable && screenStream) {
      console.log('[CALL] stopping screen stream');
      screenStream.getTracks().forEach(t => t.stop());
      screenStream = null;
      await rebuildLocalStream();
      
      // Очищаем локальное превью экрана
      try {
        const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
        if (activeScreenEl) {
          activeScreenEl.srcObject = new MediaStream();
        }
      } catch {}
    }
    
    screenEnabled = enable;
    emitLocalStatus();
    emitScreenActive(enable);
    try {
      if (currentRoomId) {
        socket.emit('screenState', { roomId: currentRoomId, active: enable });
      }
    } catch {}
  }

  socket.on('connect', () => {
    if (statusDiv) {
      statusDiv.textContent = 'Status: Connected';
      statusDiv.classList.add('connected');
    }
    try { console.log('[CALL] signaling connected', socket.id); } catch {}
  });
  socket.on('disconnect', () => {
    if (statusDiv) {
      statusDiv.textContent = 'Status: Disconnected';
      statusDiv.classList.remove('connected');
    }
    roomJoined = false;
    try { console.log('[CALL] signaling disconnected'); } catch {}
  });

  async function startLocalMedia() {
    let cameraStream: MediaStream | null = null;
    let screenStream: MediaStream | null = null;
    const shareCamera = !!shareCameraCheckbox?.checked;
    const shareScreen = !!shareScreenCheckbox?.checked;

    if (!shareCamera && !shareScreen) return;
    try {
      if (shareCamera) {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (localCamera) localCamera.srcObject = cameraStream;
      }
      if (shareScreen) {
        // @ts-ignore
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        if (localScreen) localScreen.srcObject = screenStream;
      }
      localStream = new MediaStream([
        ...(cameraStream ? cameraStream.getTracks() : []),
        ...(screenStream ? screenStream.getTracks() : [])
      ]);
      // Render self tile
      try {
        ensurePeerTile('me');
        const selfVideo = document.getElementById('remote-vid1-me') as HTMLVideoElement | null;
        if (selfVideo) {
          // Prefer camera video if present, else screen
          const vids = localStream.getVideoTracks();
          const auds = [] as MediaStreamTrack[]; // do not add mic to avoid echo on self preview
          if (vids.length) {
            selfVideo.srcObject = new MediaStream([vids[0], ...auds]);
          } else {
            selfVideo.srcObject = new MediaStream([]);
          }
          selfVideo.muted = true;
          safePlay(selfVideo);
          const placeholder = document.getElementById('placeholder-me');
          if (placeholder) placeholder.classList.add('hidden');
        }
      } catch {}
      await attachLocalToPeersAndRenegotiate();
      micEnabled = !!shareCameraCheckbox?.checked; // mic included with cam request above
      camEnabled = !!shareCameraCheckbox?.checked;
      screenEnabled = !!shareScreenCheckbox?.checked;
    } catch (e) {
      localStream = null;
      cameraStream?.getTracks().forEach((t) => t.stop());
      screenStream?.getTracks().forEach((t) => t.stop());
    }
  }

  async function joinRoomFunc() {
    const roomId = roomIdInput?.value?.trim();
    if (!roomId) return;
    // If sharing planned, start media first
    if ((shareCameraCheckbox?.checked || shareScreenCheckbox?.checked) && !localStream) {
      await startLocalMedia();
    }
    socket.emit('joinRoom', roomId);
    roomJoined = true;
    currentRoomId = roomId;
    if (statusDiv) statusDiv.textContent = `Status: Connected - In Room ${roomId}`;
    try { console.log('[CALL] joined room', roomId); } catch {}
    // Ensure self tile even as viewer
    try { ensurePeerTile('me'); } catch {}
    // Отправляем своё имя для отображения никнейма
    try {
      const name = (window as any).currentUserDisplayName || (window as any).currentUserName || null;
      socket.emit('intro', { roomId, name });
      peerNames['me'] = name || 'You';
      setTileName('me', name || 'You');
    } catch {}
  }

  function createPeerConnection(peerId: string) {
    const iceServers = options?.turnServers ?? [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:nit.nicorp.tech:3478', username: 'test', credential: 'test' },
      { urls: 'turn:nit.nicorp.tech:3478?transport=tcp', username: 'test', credential: 'test' }
    ];
    const pc = new RTCPeerConnection({ iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) socket.emit('candidate', { to: peerId, candidate: event.candidate });
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') removePeer(peerId);
      try { console.log('[CALL] ice state', peerId, pc.iceConnectionState); } catch {}
    };

    pc.ontrack = (event) => {
      handleRemoteTrack(peerId, event.track, Array.from(event.streams));
      setTileName(peerId, peerNames[peerId] || null);
    };

    // Ensure receivers exist
    try {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    } catch {}
    try {
      pc.addTransceiver('video', { direction: 'recvonly' });
    } catch {}
    if (localStream) {
      try { localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!)); } catch {}
    }

    peers[peerId] = pc;
    return pc;
  }


  function handleRemoteTrack(peerId: string, track: MediaStreamTrack, streams: MediaStream[]) {
    // Сначала определяем реальный источник трека
    const realTrackSource = getTrackSource(track);
    
    // Если у пира активен экран И это неопределённый видео трек, считаем его экраном
    const trackSource = peerScreenState[peerId] && track.kind === 'video' && realTrackSource === 'unknown'
      ? 'screen'
      : realTrackSource;
      
    console.log(`[CALL] received track from ${peerId}: ${track.kind} (${track.label || 'no-label'}) [${trackSource}] (real: ${realTrackSource}, peerScreen: ${!!peerScreenState[peerId]}, muted: ${track.muted}, enabled: ${track.enabled})`);
    
    let peerDiv = ensurePeerTile(peerId) as HTMLElement;
    const vid1 = document.getElementById(`remote-vid1-${peerId}`) as HTMLVideoElement | null;
    const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
    
    // Слушаем событие mute/unmute для скрытия/показа видео
    track.onmute = () => {
      console.log(`[CALL] track muted from ${peerId}: ${track.kind}`);
      if (track.kind === 'video' && trackSource === 'camera' && vid1) {
        vid1.srcObject = new MediaStream();
        vid1.classList.add('hidden');
        const placeholder = document.getElementById(`placeholder-${peerId}`);
        if (placeholder) placeholder.classList.remove('hidden');
        setNameVisible(peerId, false);
      } else if (track.kind === 'video' && trackSource === 'screen' && activeScreenEl) {
        activeScreenEl.srcObject = new MediaStream();
        emitScreenActive(false);
      }
    };
    
    track.onunmute = () => {
      console.log(`[CALL] track unmuted from ${peerId}: ${track.kind}`);
    };
    
    track.onended = () => {
      console.log(`[CALL] track ended from ${peerId}: ${track.kind}`);
      if (track.kind === 'video' && trackSource === 'camera' && vid1) {
        vid1.srcObject = new MediaStream();
        vid1.classList.add('hidden');
        const placeholder = document.getElementById(`placeholder-${peerId}`);
        if (placeholder) placeholder.classList.remove('hidden');
        setNameVisible(peerId, false);
      } else if (track.kind === 'video' && trackSource === 'screen' && activeScreenEl) {
        activeScreenEl.srcObject = new MediaStream();
        emitScreenActive(false);
      }
    };
    
    if (track.kind === 'video') {
      if (trackSource === 'screen') {
        // Это экран - всегда в activeScreen
        if (activeScreenEl) {
          console.log(`[CALL] screen track to activeScreen for ${peerId}`);
          activeScreenEl.srcObject = new MediaStream([track]);
          safePlay(activeScreenEl);
          emitScreenActive(true);
        }
      } else if (trackSource === 'camera') {
        // Это камера - всегда в плитку участника
        if (vid1) {
          console.log(`[CALL] camera track to participant tile for ${peerId}`);
          const aud = vid1.srcObject instanceof MediaStream ? vid1.srcObject.getAudioTracks() : [];
          vid1.srcObject = new MediaStream([track, ...aud]);
          safePlay(vid1);
          try { vid1.classList.remove('hidden'); (vid1 as any).style.display = 'block'; } catch {}
          const placeholder = document.getElementById(`placeholder-${peerId}`);
          if (placeholder) placeholder.classList.add('hidden');
          setNameVisible(peerId, true);
        }
      } else {
        // Неопределённые видеотреки при активном экране считаем экраном, иначе камерой
        if (peerScreenState[peerId] && activeScreenEl) {
          console.log(`[CALL] unknown->screen due to peer screen active for ${peerId}`);
          activeScreenEl.srcObject = new MediaStream([track]);
          safePlay(activeScreenEl);
          emitScreenActive(true);
        } else if (vid1) {
          console.log(`[CALL] unknown->camera for ${peerId}`);
          const aud = vid1.srcObject instanceof MediaStream ? vid1.srcObject.getAudioTracks() : [];
          vid1.srcObject = new MediaStream([track, ...aud]);
          safePlay(vid1);
          try { vid1.classList.remove('hidden'); (vid1 as any).style.display = 'block'; } catch {}
          const placeholder = document.getElementById(`placeholder-${peerId}`);
          if (placeholder) placeholder.classList.add('hidden');
          setNameVisible(peerId, true);
        }
      }
    } else if (track.kind === 'audio') {
      console.log(`[CALL] audio track for ${peerId}`);
      if (vid1) {
        const vids = vid1.srcObject instanceof MediaStream ? vid1.srcObject.getVideoTracks() : [];
        vid1.srcObject = new MediaStream([...vids, track]);
        safePlay(vid1);
      }
    }
    if (track.kind === 'audio') {
      // Подсветка рамки по голосу для удалённого пользователя
      try {
        const tile = document.getElementById('peer-' + peerId) as HTMLElement | null;
        const stream = streams && streams[0] ? streams[0] : new MediaStream([track]);
        if (tile && stream) {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          const data = new Uint8Array(analyser.frequencyBinCount);
          const loop = () => {
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
              const v = (data[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / data.length);
            const overlay = document.getElementById('voice-' + peerId) as HTMLElement | null;
            if (overlay) {
              if (rms > 0.06) overlay.classList.remove('hidden'); else overlay.classList.add('hidden');
            }
            const rootTile = document.getElementById('peer-' + peerId) as HTMLElement | null;
            if (rootTile) {
              if (rms > 0.06) {
                (rootTile as any).style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.9)';
              } else {
                (rootTile as any).style.boxShadow = '';
              }
            }
            voiceAnalyzers[peerId] = { ctx, analyser, rafId: requestAnimationFrame(loop) } as any;
          };
          loop();
        }
      } catch {}
    }
  }

  function removePeer(peerId: string) {
    if (peers[peerId]) {
      try { peers[peerId].close(); } catch {}
      delete peers[peerId];
    }
    // Отключаем анализатор голоса
    try {
      const v = voiceAnalyzers[peerId];
      if (v) {
        if (v.rafId) cancelAnimationFrame(v.rafId);
        v.ctx.close();
        delete voiceAnalyzers[peerId];
      }
    } catch {}
    
    const peerDiv = document.getElementById('peer-' + peerId);
    if (peerDiv) {
      peerDiv.remove();
      // Обновляем сетку при удалении участника
      updateGridColumns();
    }
    
    // Если это был пир который показывал экран, убираем activeScreen
    const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
    if (activeScreenEl && activeScreenEl.srcObject) {
      // Проверяем остались ли другие пиры
      const remainingPeers = Object.keys(peers).length;
      if (remainingPeers === 0) {
        activeScreenEl.srcObject = new MediaStream();
        emitScreenActive(false);
      }
    }
  }

  // Socket events
  socket.on('existingUsers', async (users: string[]) => {
    for (const peerId of users) {
      ensurePeerTile(peerId);
      const pc = createPeerConnection(peerId);
      // Всегда добавляем приёмники для получения треков от существующих пиров
      pc.addTransceiver('audio', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('video', { direction: 'recvonly' });
      
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: peerId, offer: pc.localDescription });
    }
  });

  socket.on('existingUsersInfo', (list: { id: string; name: string | null }[]) => {
    for (const { id, name } of list) {
      peerNames[id] = name || '';
      setTileName(id, name || null);
    }
  });

  socket.on('userIntro', ({ id, name }: { id: string; name: string | null }) => {
    peerNames[id] = name || '';
    setTileName(id, name || null);
    try {
      if (id === socket.id) setTileName('me', name || null);
    } catch {}
  });

  socket.on('userJoined', async (peerId: string) => {
    ensurePeerTile(peerId);
    const pc = createPeerConnection(peerId);
    
    // Передаём текущее состояние экрана вновь подключившемуся
    try {
      if (currentRoomId) {
        socket.emit('screenState', { roomId: currentRoomId, active: screenEnabled });
      }
    } catch {}
    
    // Если у нас есть локальные треки, новый пир должен их получить через offer/answer
    // Ждём чтобы новый пир успел отправить свой offer
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Подстраховка: инициируем локальную пере-офферизацию, чтобы треки точно поехали
    try { await attachLocalToPeersAndRenegotiate(); } catch {}
  });

  socket.on('offer', async ({ from, offer }: any) => {
    if (!peers[from]) createPeerConnection(from);
    const pc = peers[from];
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    if (!localStream) {
      pc.getTransceivers().forEach((t) => { t.direction = 'recvonly'; });
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    socket.emit('answer', { to: from, answer: pc.localDescription });
  });

  socket.on('answer', async ({ from, answer }: any) => {
    const pc = peers[from];
    if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
  });

  socket.on('candidate', async ({ from, candidate }: any) => {
    const pc = peers[from];
    if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
  });

  // Получаем состояние экрана других пиров
  socket.on('screenState', ({ from, active }: any) => {
    peerScreenState[from] = !!active;
    try { console.log('[CALL] peer screen state', from, active); } catch {}
    try { updateLayoutForScreen(!!active); } catch {}
  });

  socket.on('userLeft', (peerId: string) => removePeer(peerId));

  startBtn?.addEventListener('click', () => { startLocalMedia(); });
  joinBtn?.addEventListener('click', () => { joinRoomFunc(); });

  // Media toggle buttons
  (document.getElementById('ctrlMic') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    await setAudioEnabled(!micEnabled);
  });
  (document.getElementById('ctrlCam') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    await setCameraEnabled(!camEnabled);
  });
  (document.getElementById('ctrlScreen') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    await setScreenEnabled(!screenEnabled);
  });
  (document.getElementById('ctrlLeave') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    try { await leaveCallInternal(); } catch {}
  });

  // Точная установка состояний медиа (для pre-join)
  (window as any).callApplyPrejoin = async (mic: boolean, cam: boolean) => {
    try {
      await setAudioEnabled(!!mic);
      await setCameraEnabled(!!cam);
    } catch {}
  };

  async function leaveCallInternal() {
    try {
      for (const [peerId, pc] of Object.entries(peers)) {
        try { pc.close(); } catch {}
        delete peers[peerId];
      }
      if (localStream) {
        try { localStream.getTracks().forEach(t => t.stop()); } catch {}
      }
      if (cameraStream) {
        try { cameraStream.getTracks().forEach(t => t.stop()); } catch {}
      }
      if (screenStream) {
        try { screenStream.getTracks().forEach(t => t.stop()); } catch {}
      }
      localStream = null;
      cameraStream = null;
      screenStream = null;
      micEnabled = false;
      camEnabled = false;
      screenEnabled = false;
      emitLocalStatus();
      const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
      if (activeScreenEl) activeScreenEl.srcObject = new MediaStream();
      emitScreenActive(false);
      const remotesEl = document.getElementById('remotes') as HTMLElement | null;
      if (remotesEl) remotesEl.innerHTML = '';
      if (socket && socket.connected) {
        try { socket.disconnect(); } catch {}
      }
      roomJoined = false;
      currentRoomId = null;
    } catch {}
  }

  (window as any).leaveCallConnect = async () => {
    await leaveCallInternal();
    try { (window as any).__callConnectInit = false; } catch {}
  };

  // Если сокет был отключён, разрешим повторную инициализацию
  try {
    (window as any).__callConnectAllowReinit = () => { (window as any).__callConnectInit = false; };
  } catch {}
}

export async function leaveCall() {
  try {
    if (typeof (window as any).leaveCallConnect === 'function') {
      await (window as any).leaveCallConnect();
    }
  } catch {}
}
