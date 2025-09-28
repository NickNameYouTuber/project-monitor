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
  const participantsGrid = document.getElementById('participantsGrid') as HTMLElement | null;
  const screenStage = document.getElementById('screenStage') as HTMLElement | null;
  const screenContainer = document.getElementById('screenContainer') as HTMLElement | null;
  const pagePrevBtn = document.getElementById('pagePrev');
  const pageNextBtn = document.getElementById('pageNext');
  const screenPrevBtn = document.getElementById('screenPrev');
  const screenNextBtn = document.getElementById('screenNext');
  const statusDiv = document.getElementById('status') as HTMLElement | null;
  const startBtn = document.getElementById('startLocal');
  const joinBtn = document.getElementById('joinRoom');

  if (!remotesContainer) throw new Error('remotes container not found');

  let localStream: MediaStream | null = null;
  let roomJoined = false;

  // Socket.IO
  const socket = io('/', { path: options?.socketPath ?? '/socket.io' });
  const peers: Record<string, RTCPeerConnection> = {};
  const joinedPeers = new Set<string>();
  const camVideos: Record<string, HTMLVideoElement> = {};
  const screenVideos: Record<string, HTMLVideoElement> = {};
  let participantsPage = 0;
  let screenIndex = 0;

  function safePlay(videoEl: HTMLVideoElement | null) {
    if (!videoEl) return;
    const p: any = videoEl.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
    }
  }

  function makeTile(peerId: string, video?: HTMLVideoElement) {
    const tile = document.createElement('div');
    tile.className = 'bg-gray-800 rounded-lg overflow-hidden relative aspect-video flex items-center justify-center';
    if (video) {
      video.className = 'w-full h-full object-cover';
      tile.appendChild(video);
    } else {
      const span = document.createElement('span');
      span.className = 'text-white/80 text-sm';
      span.textContent = peerId.slice(0, 6);
      tile.appendChild(span);
    }
    return tile;
  }

  function updateLayout() {
    if (!participantsGrid) return;
    const camPeers = Object.keys(camVideos);
    const allPeers = Array.from(joinedPeers);
    const viewerPeers = allPeers.filter(p => !camVideos[p] && !screenVideos[p]);

    const perPage = 9;
    const camTiles = camPeers.map(pid => makeTile(pid, camVideos[pid]));
    const viewerTiles = viewerPeers.map(pid => makeTile(pid));
    const tiles = [...camTiles, ...viewerTiles];
    const totalPages = Math.max(1, Math.ceil(tiles.length / perPage));
    if (participantsPage >= totalPages) participantsPage = totalPages - 1;

    participantsGrid.innerHTML = '';
    const start = participantsPage * perPage;
    const pageTiles = tiles.slice(start, start + perPage);
    pageTiles.forEach(t => participantsGrid.appendChild(t));

    const screens = Object.keys(screenVideos);
    if (screens.length > 0 && screenContainer && screenStage) {
      screenStage.classList.remove('hidden');
      if (screenIndex >= screens.length) screenIndex = screens.length - 1;
      screenContainer.innerHTML = '';
      const active = screenVideos[screens[screenIndex]];
      if (active) {
        active.className = 'w-full h-[55vh] object-contain bg-black rounded-lg';
        screenContainer.appendChild(active);
        safePlay(active);
      }
    } else if (screenStage) {
      screenStage.classList.add('hidden');
    }
  }

  async function attachLocalToPeersAndRenegotiate() {
    if (!localStream) return;
    for (const [peerId, pc] of Object.entries(peers)) {
      if (!pc) continue;
      for (const track of localStream.getTracks()) {
        const hasSender = pc.getSenders().some((s) => s.track && s.track.kind === track.kind);
        if (!hasSender) {
          try { pc.addTrack(track, localStream); } catch {}
        }
      }
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('offer', { to: peerId, offer: pc.localDescription });
      } catch {}
    }
  }

  socket.on('connect', () => {
    if (statusDiv) {
      statusDiv.textContent = 'Status: Connected';
      statusDiv.classList.add('connected');
    }
  });
  socket.on('disconnect', () => {
    if (statusDiv) {
      statusDiv.textContent = 'Status: Disconnected';
      statusDiv.classList.remove('connected');
    }
    roomJoined = false;
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
      await attachLocalToPeersAndRenegotiate();
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
    if (statusDiv) statusDiv.textContent = `Status: Connected - In Room ${roomId}`;
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
    };

    pc.ontrack = (event) => {
      handleRemoteTrack(peerId, event.track, event.streams);
    };

    if (localStream) {
      try { localStream.getTracks().forEach((track) => pc.addTrack(track, localStream!)); } catch {}
    }

    peers[peerId] = pc;
    return pc;
  }

  function handleRemoteTrack(peerId: string, track: MediaStreamTrack, streams: MediaStream[]) {
    let peerDiv = document.getElementById('peer-' + peerId) as HTMLElement | null;
    if (!peerDiv) {
      peerDiv = document.createElement('div');
      peerDiv.id = 'peer-' + peerId;
      peerDiv.className = 'peer-container';
      peerDiv.innerHTML = `
        <label>Peer ${peerId} Video 1 (Camera?)</label>
        <video id="remote-vid1-${peerId}" autoplay playsinline></video>
        <label>Peer ${peerId} Video 2 (Screen?)</label>
        <video id="remote-vid2-${peerId}" autoplay playsinline></video>
      `;
      remotesContainer!.appendChild(peerDiv);
    }
    const vid1 = document.getElementById(`remote-vid1-${peerId}`) as HTMLVideoElement | null;
    const vid2 = document.getElementById(`remote-vid2-${peerId}`) as HTMLVideoElement | null;
    if (track.kind === 'video') {
      const hasVideo = (el: HTMLVideoElement | null) => !!(el && el.srcObject instanceof MediaStream && el.srcObject.getVideoTracks().length);
      if (!hasVideo(vid1)) {
        const aud = vid1 && vid1.srcObject instanceof MediaStream ? vid1.srcObject.getAudioTracks() : [];
        vid1!.srcObject = new MediaStream([track, ...(aud || [])]);
        safePlay(vid1);
        camVideos[peerId] = vid1!;
        joinedPeers.add(peerId);
        updateLayout();
        return;
      }
      if (!hasVideo(vid2)) {
        const aud2 = vid2 && vid2.srcObject instanceof MediaStream ? vid2.srcObject.getAudioTracks() : [];
        vid2!.srcObject = new MediaStream([track, ...(aud2 || [])]);
        safePlay(vid2);
        screenVideos[peerId] = vid2!;
        joinedPeers.add(peerId);
        updateLayout();
        return;
      }
      const aud2 = vid2 && vid2.srcObject instanceof MediaStream ? vid2.srcObject.getAudioTracks() : [];
      vid2!.srcObject = new MediaStream([track, ...(aud2 || [])]);
      safePlay(vid2);
      screenVideos[peerId] = vid2!;
      joinedPeers.add(peerId);
      updateLayout();
    } else if (track.kind === 'audio') {
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
    delete camVideos[peerId];
    delete screenVideos[peerId];
    joinedPeers.delete(peerId);
    updateLayout();
  }

  // Socket events
  socket.on('existingUsers', async (users: string[]) => {
    for (const peerId of users) {
      joinedPeers.add(peerId);
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
    joinedPeers.add(peerId);
    createPeerConnection(peerId);
    updateLayout();
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

  socket.on('userLeft', (peerId: string) => removePeer(peerId));
  pagePrevBtn?.addEventListener('click', () => { participantsPage = Math.max(0, participantsPage - 1); updateLayout(); });
  pageNextBtn?.addEventListener('click', () => { participantsPage += 1; updateLayout(); });
  screenPrevBtn?.addEventListener('click', () => { screenIndex = Math.max(0, screenIndex - 1); updateLayout(); });
  screenNextBtn?.addEventListener('click', () => { screenIndex += 1; updateLayout(); });

  // UI may be hidden; handlers are optional
  startBtn?.addEventListener('click', () => { startLocalMedia(); });
  joinBtn?.addEventListener('click', () => { joinRoomFunc(); });

  // Control helpers
  async function toggleMic() {
    const hasAudio = localStream?.getAudioTracks().length;
    if (!hasAudio) {
      try {
        const audio = await navigator.mediaDevices.getUserMedia({ audio: true });
        const track = audio.getAudioTracks()[0];
        if (!localStream) localStream = new MediaStream([]);
        localStream.addTrack(track);
        for (const pc of Object.values(peers)) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
          if (sender) await sender.replaceTrack(track); else pc.addTrack(track, localStream);
        }
      } catch {}
      return true;
    } else {
      // disable audio
      const tracks = localStream!.getAudioTracks();
      tracks.forEach(t => t.stop());
      for (const pc of Object.values(peers)) {
        const sender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
        if (sender) await sender.replaceTrack(null as any);
      }
      tracks.forEach(t => localStream!.removeTrack(t));
      return false;
    }
  }

  async function toggleCamera() {
    const hasVideo = localStream?.getVideoTracks().some(t => t.label && !t.label.toLowerCase().includes('display'));
    if (!hasVideo) {
      try {
        const cam = await navigator.mediaDevices.getUserMedia({ video: true });
        const track = cam.getVideoTracks()[0];
        if (!localStream) localStream = new MediaStream([]);
        localStream.addTrack(track);
        for (const pc of Object.values(peers)) {
          // Prefer replacing a video sender that is not screen
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video' && !(s.track.label||'').toLowerCase().includes('display'))
            || pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) await sender.replaceTrack(track); else pc.addTrack(track, localStream);
        }
      } catch {}
      return true;
    } else {
      const tracks = (localStream!.getVideoTracks() || []).filter(t => !t.label.toLowerCase().includes('display'));
      tracks.forEach(t => t.stop());
      for (const pc of Object.values(peers)) {
        for (const t of tracks) {
          const sender = pc.getSenders().find(s => s.track && s.track.id === t.id);
          if (sender) await sender.replaceTrack(null as any);
        }
      }
      tracks.forEach(t => localStream!.removeTrack(t));
      return false;
    }
  }

  async function toggleScreen() {
    const screenTracks = (localStream?.getVideoTracks() || []).filter(t => (t.label||'').toLowerCase().includes('display') || (t.label||'').toLowerCase().includes('screen') || (t.label||'').toLowerCase().includes('window'));
    const hasScreen = screenTracks.length > 0;
    if (!hasScreen) {
      try {
        // @ts-ignore
        const scr = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const track = scr.getVideoTracks()[0];
        if (!localStream) localStream = new MediaStream([]);
        localStream.addTrack(track);
        for (const pc of Object.values(peers)) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video' && ((s.track.label||'').toLowerCase().includes('display')|| (s.track.label||'').toLowerCase().includes('screen') ))
            || pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) await sender.replaceTrack(track); else pc.addTrack(track, localStream);
        }
        track.onended = async () => { await toggleScreen(); };
      } catch {}
      return true;
    } else {
      for (const t of screenTracks) t.stop();
      for (const pc of Object.values(peers)) {
        for (const t of screenTracks) {
          const sender = pc.getSenders().find(s => s.track && s.track.id === t.id);
          if (sender) await sender.replaceTrack(null as any);
        }
      }
      screenTracks.forEach(t => localStream!.removeTrack(t));
      return false;
    }
  }

  async function leave() {
    for (const pc of Object.values(peers)) { try { pc.close(); } catch {} }
    for (const t of (localStream?.getTracks() || [])) { try { t.stop(); } catch {} }
    localStream = null;
    for (const el of Array.from(document.querySelectorAll('[id^="peer-"]'))) {
      el.remove();
    }
    roomJoined = false;
  }

  return {
    join: (roomId: string) => {
      if (roomIdInput) roomIdInput.value = roomId;
      return joinRoomFunc();
    },
    toggleMic,
    toggleCamera,
    toggleScreen,
    leave,
  };
}
