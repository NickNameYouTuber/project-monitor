/* eslint-disable */
// NOTE: Порт перенесён из public/call.html. Этот модуль связывает DOM-элементы и логику сигналинга/RTC.
import { io } from 'socket.io-client';

export function initCallConnect(options?: {
  socketPath?: string;
  turnServers?: { urls: string; username?: string; credential?: string }[];
  roomId?: string;
  autoJoin?: boolean;
  enableMic?: boolean;
  enableCam?: boolean;
  enableScreen?: boolean;
  onPeerAdded?: (peerId: string, el: HTMLElement, isScreen: boolean) => void;
  onPeerCategoryChanged?: (peerId: string, isScreen: boolean) => void;
  onPeerRemoved?: (peerId: string) => void;
}) {
  const localCamera = document.getElementById('localCamera') as HTMLVideoElement | null;
  const localScreen = document.getElementById('localScreen') as HTMLVideoElement | null;
  const shareCameraCheckbox = document.getElementById('shareCamera') as HTMLInputElement | null;
  const shareScreenCheckbox = document.getElementById('shareScreen') as HTMLInputElement | null;
  const roomIdInput = document.getElementById('roomId') as HTMLInputElement | null;
  let remotesContainer = document.getElementById('remotes') as HTMLElement | null;
  let screensContainer = document.getElementById('screens') as HTMLElement | null;
  let peersContainer = (document.getElementById('peers') as HTMLElement | null) || remodesFallback();
  const statusDiv = document.getElementById('status') as HTMLElement | null;
  const startBtn = document.getElementById('startLocal');
  const joinBtn = document.getElementById('joinRoom');

  function remodesFallback() {
    const candidates = [document.getElementById('peers'), document.getElementById('remotes'), document.getElementById('screens')].filter(Boolean) as HTMLElement[];
    if (candidates[0]) return candidates[0];
    // Создаём дефолтный контейнер если ничего не найдено
    const el = document.createElement('div');
    el.id = 'peers';
    document.body.appendChild(el);
    return el;
  }

  let localStream: MediaStream | null = null;
  let roomJoined = false;

  // Socket.IO
  const socket = io('/', { path: options?.socketPath ?? '/socket.io' });
  const peers: Record<string, RTCPeerConnection> = {};

  function safePlay(videoEl: HTMLVideoElement | null) {
    if (!videoEl) return;
    const p: any = videoEl.play();
    if (p && typeof p.then === 'function') {
      p.catch(() => {});
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

  function setDeviceCheckboxes() {
    if (shareCameraCheckbox) shareCameraCheckbox.checked = !!options?.enableCam;
    if (shareScreenCheckbox) shareScreenCheckbox.checked = !!options?.enableScreen;
  }

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
      peerDiv.setAttribute('data-peerid', peerId);
      peerDiv.innerHTML = `
        <label>Peer ${peerId} Video 1 (Camera?)</label>
        <video id="remote-vid1-${peerId}" autoplay playsinline></video>
        <label>Peer ${peerId} Video 2 (Screen?)</label>
        <video id="remote-vid2-${peerId}" autoplay playsinline></video>
      `;
      (peersContainer || remotesContainer)!.appendChild(peerDiv);
      try {
        options?.onPeerAdded?.(peerId, peerDiv, false);
      } catch {}
    }
    const vid1 = document.getElementById(`remote-vid1-${peerId}`) as HTMLVideoElement | null;
    const vid2 = document.getElementById(`remote-vid2-${peerId}`) as HTMLVideoElement | null;
    if (track.kind === 'video') {
      const hasVideo = (el: HTMLVideoElement | null) => !!(el && el.srcObject instanceof MediaStream && el.srcObject.getVideoTracks().length);
      // Determine screen by label
      const label = (track.label || '').toLowerCase();
      const isScreen = label.includes('screen') || label.includes('display') || label.includes('window');
      // Move peer tile into appropriate container
      if (isScreen && screensContainer && peerDiv?.parentElement !== screensContainer) {
        screensContainer.appendChild(peerDiv!);
        try { options?.onPeerCategoryChanged?.(peerId, true); } catch {}
      } else if (!isScreen && peersContainer && peerDiv?.parentElement !== peersContainer) {
        peersContainer.appendChild(peerDiv!);
        try { options?.onPeerCategoryChanged?.(peerId, false); } catch {}
      }

      if (!hasVideo(vid1)) {
        const aud = vid1 && vid1.srcObject instanceof MediaStream ? vid1.srcObject.getAudioTracks() : [];
        vid1!.srcObject = new MediaStream([track, ...(aud || [])]);
        safePlay(vid1);
        return;
      }
      if (!hasVideo(vid2)) {
        const aud2 = vid2 && vid2.srcObject instanceof MediaStream ? vid2.srcObject.getAudioTracks() : [];
        vid2!.srcObject = new MediaStream([track, ...(aud2 || [])]);
        safePlay(vid2);
        return;
      }
      const aud2 = vid2 && vid2.srcObject instanceof MediaStream ? vid2.srcObject.getAudioTracks() : [];
      vid2!.srcObject = new MediaStream([track, ...(aud2 || [])]);
      safePlay(vid2);
      // If this was a screen track, ensure tile is in screens container
      if (isScreen && screensContainer && peerDiv?.parentElement !== screensContainer) {
        screensContainer.appendChild(peerDiv!);
        try { options?.onPeerCategoryChanged?.(peerId, true); } catch {}
      }
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
    try { options?.onPeerRemoved?.(peerId); } catch {}
  }

  // Socket events
  socket.on('existingUsers', async (users: string[]) => {
    for (const peerId of users) {
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
    createPeerConnection(peerId);
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

  startBtn?.addEventListener('click', () => { startLocalMedia(); });
  joinBtn?.addEventListener('click', () => { joinRoomFunc(); });

  // Initialize device defaults
  setDeviceCheckboxes();
  // Auto-join support
  if (options?.roomId) {
    if (roomIdInput) roomIdInput.value = options.roomId;
    if (options.autoJoin) {
      joinRoomFunc();
    }
  }

  // Controls API for React UI
  const getAudioTrack = () => localStream?.getAudioTracks()?.[0];
  const getCameraTrack = () => (localStream?.getVideoTracks() || []).find(t => !(t.label||'').toLowerCase().includes('screen'));
  const getScreenTrack = () => (localStream?.getVideoTracks() || []).find(t => (t.label||'').toLowerCase().includes('screen'));

  async function toggleMic() {
    const t = getAudioTrack();
    if (t) { t.enabled = !t.enabled; return t.enabled; }
    // no audio present → start only audio
    try {
      const a = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!localStream) localStream = new MediaStream();
      a.getAudioTracks().forEach(tr => localStream!.addTrack(tr));
      await attachLocalToPeersAndRenegotiate();
      return true;
    } catch { return false; }
  }

  async function toggleCam() {
    const t = getCameraTrack();
    if (t) { t.enabled = !t.enabled; return t.enabled; }
    try {
      const v = await navigator.mediaDevices.getUserMedia({ video: true });
      if (!localStream) localStream = new MediaStream();
      v.getVideoTracks().forEach(tr => localStream!.addTrack(tr));
      await attachLocalToPeersAndRenegotiate();
      return true;
    } catch { return false; }
  }

  async function toggleScreen() {
    const t = getScreenTrack();
    if (t) {
      // stop screen track
      t.stop();
      if (localStream) {
        localStream.removeTrack(t);
        await attachLocalToPeersAndRenegotiate();
      }
      return false;
    }
    try {
      // @ts-ignore
      const s = await navigator.mediaDevices.getDisplayMedia({ video: true });
      if (!localStream) localStream = new MediaStream();
      const track = s.getVideoTracks()[0];
      localStream.addTrack(track);
      track.onended = async () => {
        if (localStream) {
          localStream.removeTrack(track);
          await attachLocalToPeersAndRenegotiate();
        }
      };
      await attachLocalToPeersAndRenegotiate();
      return true;
    } catch { return false; }
  }

  function leave() {
    Object.values(peers).forEach(pc => { try { pc.close(); } catch {} });
    for (const tr of (localStream?.getTracks() || [])) { try { tr.stop(); } catch {} }
    localStream = null;
  }

  function join(room?: string) {
    if (room && roomIdInput) roomIdInput.value = room;
    joinRoomFunc();
  }

  return { toggleMic, toggleCam, toggleScreen, leave, join, startLocal: startLocalMedia };
}
