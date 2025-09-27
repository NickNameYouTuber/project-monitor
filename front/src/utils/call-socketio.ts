import { io, Socket } from 'socket.io-client';

type PeerId = string;

export type StreamCallback = (peerId: PeerId, stream: MediaStream | null) => void;

export class CallSocketIOService {
  private socket!: Socket;
  private readonly url: string;
  private readonly roomId: string;
  private readonly iceServers: RTCIceServer[];
  private readonly peers = new Map<PeerId, RTCPeerConnection>();
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
      this.socket.emit('joinRoom', this.roomId);
    });
    this.socket.on('existingUsers', async (users: string[]) => {
      for (const peerId of users) {
        const pc = this.createPeer(peerId);
        if (!this.localStream) {
          pc.addTransceiver('audio', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('video', { direction: 'recvonly' });
        }
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { to: peerId, offer: pc.localDescription });
      }
    });
    this.socket.on('userJoined', async (peerId: string) => {
      this.createPeer(peerId);
    });
    this.socket.on('offer', async ({ from, offer }: any) => {
      const pc = this.peers.get(from) || this.createPeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (!this.localStream) {
        pc.getTransceivers().forEach(t => t.direction = 'recvonly');
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      this.socket.emit('answer', { to: from, answer: pc.localDescription });
    });
    this.socket.on('answer', async ({ from, answer }: any) => {
      const pc = this.peers.get(from);
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
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
    pc.onicecandidate = (e) => {
      if (e.candidate) this.socket.emit('candidate', { to: peerId, candidate: e.candidate });
    };
    pc.onnegotiationneeded = async () => {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this.socket.emit('offer', { to: peerId, offer: pc.localDescription });
      } catch {}
    };
    pc.ontrack = (e) => {
      const stream = e.streams[0];
      if (!stream) return;
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      if (videoTracks.length > 1) {
        this.streamCb(`${peerId}:screen`, new MediaStream([videoTracks[1]]));
      }
      if (videoTracks.length > 0) {
        this.streamCb(peerId, new MediaStream([videoTracks[0], ...(audioTracks[0] ? [audioTracks[0]] : [])]));
      } else if (audioTracks.length > 0) {
        this.streamCb(peerId, new MediaStream([audioTracks[0]]));
      }
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
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream!));
    }
    this.peers.set(peerId, pc);
    return pc;
  }
}


