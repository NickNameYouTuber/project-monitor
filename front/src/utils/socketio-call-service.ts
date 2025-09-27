import { io, Socket } from 'socket.io-client';

type PeerId = string;

export type StreamCallback = (peerId: PeerId, stream: MediaStream | null) => void;

export class SocketIoCallService {
  private socket!: Socket;
  private readonly url: string;
  private readonly roomId: string;
  private readonly iceServers: RTCIceServer[];
  private readonly peers = new Map<PeerId, RTCPeerConnection>();
  private streamCb: StreamCallback = () => {};
  public localStream: MediaStream | null = null;
  public localVideoTrack: MediaStreamTrack | null = null;
  public localScreenStream: MediaStream | null = null;
  public localScreenTrack: MediaStreamTrack | null = null;

  constructor(url: string, roomId: string, iceServers: RTCIceServer[]) {
    this.url = url;
    this.roomId = roomId;
    this.iceServers = iceServers;
  }

  onStream(cb: StreamCallback) { this.streamCb = cb; }

  async initLocalAudio() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.streamCb('self', this.localStream);
  }

  async enableVideo() {
    if (!this.localStream) await this.initLocalAudio();
    const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    const [track] = s.getVideoTracks();
    if (!track) return;
    this.localVideoTrack = track;
    try { this.localStream!.addTrack(track); } catch {}
    for (const [, pc] of this.peers) {
      const sender = pc.getSenders().find(x => x.track && x.track.kind === 'video');
      if (sender) { try { await sender.replaceTrack(track); } catch {} } else { try { pc.addTrack(track, this.localStream!); } catch {} }
    }
    this.streamCb('self', this.localStream!);
  }

  async disableVideo() {
    if (!this.localVideoTrack) return;
    const t = this.localVideoTrack;
    for (const [, pc] of this.peers) {
      const sender = pc.getSenders().find(x => x.track === t);
      if (sender) { try { await sender.replaceTrack(null); } catch {} }
    }
    try { this.localStream?.removeTrack(t); } catch {}
    try { t.stop(); } catch {}
    this.localVideoTrack = null;
    this.streamCb('self', this.localStream!);
  }

  async enableScreenShare() {
    const ds = await (navigator.mediaDevices as any).getDisplayMedia({ video: true, audio: false });
    const [screenTrack] = ds.getVideoTracks();
    if (!screenTrack) return;
    this.localScreenTrack = screenTrack;
    this.localScreenStream = new MediaStream([screenTrack]);
    for (const [, pc] of this.peers) {
      const sender = pc.getSenders().find(x => x.track && x.track.kind === 'video' && (x as any)._isScreen);
      if (sender) { try { await sender.replaceTrack(screenTrack); } catch {} } else { try { pc.addTrack(screenTrack, this.localScreenStream); } catch {} }
    }
    const onEnded = () => { this.disableScreenShare().catch(() => {}); };
    try { screenTrack.addEventListener('ended', onEnded); } catch {}
    this.streamCb('self:screen', this.localScreenStream);
  }

  async disableScreenShare() {
    if (!this.localScreenTrack) return;
    const t = this.localScreenTrack;
    for (const [, pc] of this.peers) {
      const sender = pc.getSenders().find(x => x.track === t);
      if (sender) { try { await sender.replaceTrack(null); } catch {} }
    }
    try { t.stop(); } catch {}
    this.localScreenTrack = null;
    this.localScreenStream = null;
    this.streamCb('self:screen', null);
  }

  async setScreenQuality(_: 'low' | 'medium' | 'high') { return; }

  private createPeer(peerId: PeerId): RTCPeerConnection {
    let pc = this.peers.get(peerId);
    if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: this.iceServers });
    this.peers.set(peerId, pc);
    if (this.localStream) this.localStream.getTracks().forEach(track => pc!.addTrack(track, this.localStream!));
    if (this.localScreenTrack && this.localScreenStream) pc!.addTrack(this.localScreenTrack, this.localScreenStream);
    pc.onicecandidate = (e) => {
      if (e.candidate) this.socket.emit('candidate', { to: peerId, candidate: e.candidate });
    };
    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (!stream) return;
      const vids = stream.getVideoTracks();
      const auds = stream.getAudioTracks();
      if (vids.length > 0) {
        const mix = new MediaStream([vids[0], ...(auds[0] ? [auds[0]] : [])]);
        this.streamCb(peerId, mix);
      }
      if (vids.length > 1) {
        const screenOnly = new MediaStream([vids[1]]);
        this.streamCb(`${peerId}:screen`, screenOnly);
      }
      if (vids.length === 0 && auds.length > 0) {
        const audioOnly = new MediaStream([auds[0]]);
        this.streamCb(peerId, audioOnly);
      }
    };
    return pc;
  }

  async connect() {
    this.socket = io(this.url, { withCredentials: true });
    this.socket.on('connect', () => {});
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
      const pc = this.createPeer(from);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (!this.localStream) pc.getTransceivers().forEach(t => { t.direction = 'recvonly'; });
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

  async joinRoom() {
    this.socket.emit('joinRoom', this.roomId);
  }

  async disconnect() {
    try { this.socket?.disconnect(); } catch {}
    for (const [pid, pc] of this.peers) { try { pc.close(); } catch {}; this.peers.delete(pid); this.streamCb(pid, null); this.streamCb(`${pid}:screen`, null); }
    if (this.localStream) { this.localStream.getTracks().forEach(t => t.stop()); this.localStream = null; }
    if (this.localScreenTrack) { try { this.localScreenTrack.stop(); } catch {}; this.localScreenTrack = null; this.localScreenStream = null; }
  }
}


