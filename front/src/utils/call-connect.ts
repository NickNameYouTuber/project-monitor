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
}
