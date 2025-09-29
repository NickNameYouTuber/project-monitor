/* eslint-disable */
// NOTE: Порт перенесён из public/call.html. Этот модуль связывает DOM-элементы и логику сигналинга/RTC.
import { io } from 'socket.io-client';

export function initCallConnect(options?: { socketPath?: string; turnServers?: { urls: string; username?: string; credential?: string }[] }) {
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
    const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
    const remotesEl = document.getElementById('remotes') as HTMLElement | null;
    if (!remotesEl) return;
    if (active) {
      // Показать верхний экран и сделать нижнюю полосу горизонтальной
      if (activeScreenEl) activeScreenEl.classList.remove('hidden');
      remotesEl.className = 'flex justify-center items-center gap-4 p-4';
    } else {
      // Спрятать верхний экран и включить сетку 3x2
      if (activeScreenEl) activeScreenEl.classList.add('hidden');
      remotesEl.className = 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4';
    }
  }

  function ensurePeerTile(peerId: string) {
    if (!participantsContainer) return;
    let peerDiv = document.getElementById('peer-' + peerId) as HTMLElement | null;
    if (!peerDiv) {
      peerDiv = document.createElement('div');
      peerDiv.id = 'peer-' + peerId;
      peerDiv.className = 'rounded-xl overflow-hidden ring-1 ring-[#2A2D32] bg-[#16171A] w-full relative flex items-center justify-center';
      peerDiv.innerHTML = `
        <video id="remote-vid1-${peerId}" autoplay playsinline class="absolute inset-0 w-full h-full object-cover bg-black hidden" style="aspect-ratio:16/9"></video>
        <div id="placeholder-${peerId}" class="text-[#AAB0B6] text-xs">${peerId === 'me' ? 'You' : peerId}</div>
      `;
      participantsContainer.appendChild(peerDiv);
      try { console.log('[CALL] tile created for', peerId); } catch {}
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
        } else {
          selfVideo.srcObject = new MediaStream();
          const placeholder = document.getElementById('placeholder-me');
          if (placeholder) placeholder.classList.remove('hidden');
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
        pc.removeTrack(audioSender);
        console.log(`[CALL] removed audio track`);
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
    
    // Удаляем лишние видео senders
    for (let i = newVideoTracks.length; i < videoSenders.length; i++) {
      try {
        pc.removeTrack(videoSenders[i]);
        console.log(`[CALL] removed extra video sender ${i}`);
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
    emitLocalStatus();
  }

  async function setCameraEnabled(enable: boolean) {
    try { console.log('[CALL] camera toggle', enable, 'current cameraStream:', !!cameraStream); } catch {}
    
    if (enable && !cameraStream) {
      try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        console.log('[CALL] camera stream created');
        await rebuildLocalStream();
      } catch (e) {
        console.error('[CALL] failed to get camera:', e);
        return;
      }
    } else if (!enable && cameraStream) {
      console.log('[CALL] stopping camera stream');
      cameraStream.getTracks().forEach(t => t.stop());
      cameraStream = null;
      rebuildLocalStream();
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
      rebuildLocalStream();
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
      
    console.log(`[CALL] received track from ${peerId}: ${track.kind} (${track.label || 'no-label'}) [${trackSource}] (real: ${realTrackSource}, peerScreen: ${!!peerScreenState[peerId]})`);
    
    let peerDiv = ensurePeerTile(peerId) as HTMLElement;
    const vid1 = document.getElementById(`remote-vid1-${peerId}`) as HTMLVideoElement | null;
    const activeScreenEl = document.getElementById('activeScreen') as HTMLVideoElement | null;
    
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
  }

  function removePeer(peerId: string) {
    if (peers[peerId]) {
      try { peers[peerId].close(); } catch {}
      delete peers[peerId];
    }
    
    const peerDiv = document.getElementById('peer-' + peerId);
    if (peerDiv) peerDiv.remove();
    
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
      if (!localStream) {
        pc.addTransceiver('audio', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('video', { direction: 'recvonly' });
      }
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('offer', { to: peerId, offer: pc.localDescription });
    }
  });

  socket.on('userJoined', async (peerId: string) => {
    ensurePeerTile(peerId);
    createPeerConnection(peerId);
    // Передаём текущее состояние экрана вновь подключившемуся
    try {
      if (currentRoomId) {
        socket.emit('screenState', { roomId: currentRoomId, active: screenEnabled });
      }
    } catch {}
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
}
