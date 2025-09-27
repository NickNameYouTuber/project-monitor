import { io, Socket } from 'socket.io-client';

type PeerId = string;

export type StreamCallback = (peerId: PeerId, stream: MediaStream | null) => void;

export class CallSocketIOService {
  private socket!: Socket;
  private readonly url: string;
  private readonly roomId: string;
  private readonly iceServers: RTCIceServer[];
  private readonly peers = new Map<PeerId, RTCPeerConnection>();
  private readonly transceivers = new Map<PeerId, { audio: RTCRtpTransceiver; camera: RTCRtpTransceiver; screen: RTCRtpTransceiver }>();
  private readonly makingOffer = new Map<PeerId, boolean>();
  private selfId: string = '';
  private streamCb: StreamCallback = () => {};
  public localStream: MediaStream | null = null;
  public localCameraTrack: MediaStreamTrack | null = null;
  public localScreenTrack: MediaStreamTrack | null = null;

  constructor(url: string, roomId: string, iceServers: RTCIceServer[]) {
    this.url = url;
    this.roomId = roomId;
    this.iceServers = iceServers;
  }

  onStream(cb: StreamCallback) { this.streamCb = cb; }

  async startLocalMedia(shareCamera: boolean, shareScreen: boolean) {
    let cameraStream: MediaStream | null = null;
    let screenStream: MediaStream | null = null;
    if (shareCamera) {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      this.localCameraTrack = cameraStream.getVideoTracks()[0] || null;
      this.streamCb('self', cameraStream);
    }
    if (shareScreen) {
      screenStream = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
      this.localScreenTrack = screenStream.getVideoTracks()[0] || null;
      this.streamCb('self:screen', screenStream);
    }
    this.localStream = new MediaStream([
      ...(cameraStream ? cameraStream.getTracks() : []),
      ...(screenStream ? screenStream.getTracks() : [])
    ]);
  }

  async enableVideo() {
    if (this.localCameraTrack && this.localStream) return;
    const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const vt = cam.getVideoTracks()[0];
    if (!vt) return;
    this.localCameraTrack = vt;
    if (!this.localStream) this.localStream = new MediaStream();
    try { this.localStream.addTrack(vt); } catch {}
    for (const [, pc] of this.peers) {
      try { pc.addTrack(vt, this.localStream); } catch {}
    }
    this.streamCb('self', this.localStream);
  }

  async disableVideo() {
    if (!this.localCameraTrack) return;
    const tr = this.localCameraTrack;
    try { this.localStream?.removeTrack(tr); } catch {}
    try { tr.stop(); } catch {}
    this.localCameraTrack = null;
    // не трогаем sender'ов — браузер сам отправит нулевой
    this.streamCb('self', this.localStream || null);
  }

  async enableScreenShare() {
    if (this.localScreenTrack) return;
    const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: true });
    const st = ds.getVideoTracks()[0];
    if (!st) return;
    this.localScreenTrack = st;
    if (!this.localStream) this.localStream = new MediaStream();
    try { this.localStream.addTrack(st); } catch {}
    for (const [, pc] of this.peers) {
      try { pc.addTrack(st, this.localStream); } catch {}
    }
    const onEnded = () => this.disableScreenShare().catch(() => {});
    try { st.addEventListener('ended', onEnded); } catch {}
    this.streamCb('self:screen', new MediaStream([st]));
  }

  async disableScreenShare() {
    if (!this.localScreenTrack) return;
    const st = this.localScreenTrack;
    try { this.localStream?.removeTrack(st); } catch {}
    try { st.stop(); } catch {}
    this.localScreenTrack = null;
    this.streamCb('self:screen', null);
  }

  async setScreenQuality(_: 'low' | 'medium' | 'high') { return; }

  connect() {
    this.socket = io(this.url, { transports: ['websocket'], withCredentials: true });
    this.socket.on('connect', () => {
      this.selfId = this.socket.id || '';
      this.socket.emit('joinRoom', this.roomId);
    });
    this.socket.on('existingUsers', async (users: string[]) => {
      for (const peerId of users) {
        const pc = this.createPeer(peerId);
        // детерминированный инициатор — только у кого selfId > peerId
        const initiator = (this.selfId || '') > peerId;
        if (initiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this.socket.emit('offer', { to: peerId, offer: pc.localDescription });
        }
      }
    });
    this.socket.on('userJoined', async (peerId: string) => {
      this.createPeer(peerId);
    });
    this.socket.on('offer', async ({ from, offer }: any) => {
      const pc = this.peers.get(from) || this.createPeer(from);
      const polite = (this.selfId || '') > from;
      try {
        if (pc.signalingState !== 'stable') {
          if (!polite && this.makingOffer.get(from)) {
            return; // неполитный, сам делает offer — игнор
          }
          try { await pc.setLocalDescription({ type: 'rollback' } as any); } catch {}
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        this.socket.emit('answer', { to: from, answer: pc.localDescription });
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[CallSocketIO] handle offer failed', e);
      }
    });
    this.socket.on('answer', async ({ from, answer }: any) => {
      const pc = this.peers.get(from);
      if (!pc) return;
      if (pc.signalingState !== 'have-local-offer') return;
      try { await pc.setRemoteDescription(new RTCSessionDescription(answer)); } catch {}
    });
    this.socket.on('candidate', async ({ from, candidate }: any) => {
      const pc = this.peers.get(from);
      if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    this.socket.on('userLeft', (peerId: string) => {
      const pc = this.peers.get(peerId);
      if (pc) pc.close();
      this.peers.delete(peerId);
      this.streamCb(peerId, null);
      this.streamCb(`${peerId}:screen`, null);
    });
  }

  disconnect() {
    try { this.socket?.disconnect(); } catch {}
    for (const [, pc] of this.peers) try { pc.close(); } catch {}
    this.peers.clear();
  }

  private createPeer(peerId: string) {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(peerId, pc);

    // Предсоздаём трансиверы в фиксированном порядке: 0-audio, 1-video(camera), 2-video(screen)
    const tAudio = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const tCamera = pc.addTransceiver('video', { direction: 'sendrecv' });
    const tScreen = pc.addTransceiver('video', { direction: 'sendrecv' });
    this.transceivers.set(peerId, { audio: tAudio, camera: tCamera, screen: tScreen });

    // Привязываем локальные треки, если уже есть
    const aTrack = this.localStream?.getAudioTracks()[0] || null;
    if (aTrack) { try { tAudio.sender.replaceTrack(aTrack); } catch {} }
    if (this.localCameraTrack) { try { tCamera.sender.replaceTrack(this.localCameraTrack); } catch {} }
    if (this.localScreenTrack) { try { tScreen.sender.replaceTrack(this.localScreenTrack); } catch {} }

    pc.onicecandidate = (e) => {
      if (e.candidate) this.socket.emit('candidate', { to: peerId, candidate: e.candidate });
    };
    pc.onnegotiationneeded = async () => {
      // Делаем оффер только детерминированному инициатору, чтобы избежать коллизий
      const initiator = (this.selfId || '') > peerId;
      if (!initiator) return;
      try {
        this.makingOffer.set(peerId, true);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { to: peerId, offer: pc.localDescription });
      } catch {
      } finally {
        this.makingOffer.set(peerId, false);
      }
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;
      const trefs = this.transceivers.get(peerId);
      const isScreenByMid = !!(trefs && e.transceiver && (e.transceiver === trefs.screen || (trefs.screen && e.transceiver.mid === trefs.screen.mid)));
      if (isScreenByMid) {
        const v = stream.getVideoTracks()[0];
        this.streamCb(`${peerId}:screen`, v ? new MediaStream([v]) : null);
        return;
      }
      const v = stream.getVideoTracks()[0];
      const a = stream.getAudioTracks()[0];
      if (v || a) this.streamCb(peerId, new MediaStream([...(v ? [v] : []), ...(a ? [a] : [])]));
    };
    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        const cur = this.peers.get(peerId);
        if (cur === pc) {
          try { pc.close(); } catch {}
          this.peers.delete(peerId);
          this.streamCb(peerId, null);
          this.streamCb(`${peerId}:screen`, null);
        }
      }
    };
    return pc;
  }
}


