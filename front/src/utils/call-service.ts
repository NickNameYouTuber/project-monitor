type PeerId = string;

interface SignalingMessage {
  type: 'join' | 'leave' | 'offer' | 'answer' | 'candidate' | 'peers' | 'peer-joined' | 'peer-left' | 'screen-start' | 'screen-stop';
  roomId?: string;
  peerId?: string;
  from?: string;
  to?: string;
  data?: any;
  peers?: string[];
}

export type StreamCallback = (peerId: PeerId, stream: MediaStream | null) => void;

export class CallService {
  private ws!: WebSocket;
  private readonly wsUrl: string;
  private readonly roomId: string;
  private readonly rtcConfig: RTCConfiguration;
  private readonly peerConnections = new Map<PeerId, RTCPeerConnection>();
  private readonly transceiversByPeer = new Map<PeerId, { audio?: RTCRtpTransceiver; video?: RTCRtpTransceiver; screen?: RTCRtpTransceiver }>();
  private streamCb: StreamCallback = () => {};
  public localStream: MediaStream | null = null;
  public localVideoTrack: MediaStreamTrack | null = null;
  public localScreenStream: MediaStream | null = null;
  public localScreenTrack: MediaStreamTrack | null = null;
  private screenQuality: 'low' | 'medium' | 'high' = 'medium';
  private selfId: string = Math.random().toString(36).slice(2);
  private reconnect = true;
  private reconnectAttempt = 0;
  private expectedScreenByPeer = new Map<PeerId, string | null>();
  private makingOffer = new Map<PeerId, boolean>();

  constructor(wsUrl: string, roomId: string, iceServers: RTCIceServer[], forceRelay: boolean = false) {
    this.wsUrl = wsUrl;
    this.roomId = roomId;
    this.rtcConfig = {
      iceServers,
      iceTransportPolicy: forceRelay ? 'relay' : undefined
    } as RTCConfiguration;
  }

  onStream(cb: StreamCallback) { this.streamCb = cb; }

  async initLocalAudio() {
    this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    this.streamCb('self', this.localStream);
  }

  async enableVideo(deviceId?: string, constraints?: MediaTrackConstraints) {
    if (!this.localStream) {
      await this.initLocalAudio();
    }
    const videoConstraints: MediaTrackConstraints = {
      deviceId: deviceId ? { exact: deviceId } : undefined,
      width: constraints?.width ?? { ideal: 1280 },
      height: constraints?.height ?? { ideal: 720 },
      frameRate: constraints?.frameRate ?? { ideal: 30 },
    };
    const videoStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: false });
    const [videoTrack] = videoStream.getVideoTracks();
    if (!videoTrack) return;
    this.localVideoTrack = videoTrack;
    try { this.localStream!.addTrack(videoTrack); } catch {}
    // заменить трек в заранее созданных трансиверах video
    for (const [pid, pc] of this.peerConnections) {
      try {
        const trefs = this.transceiversByPeer.get(pid);
        const v = trefs?.video;
        if (v) await v.sender.replaceTrack(videoTrack);
        else {
          // fallback на случай отсутствия предсозданного трансивера
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
            || pc.getSenders().find(s => !s.track && s.transport);
          if (sender) await sender.replaceTrack(videoTrack); else pc.addTrack(videoTrack, this.localStream!);
        }
      } catch {}
    }
    this.streamCb('self', this.localStream!);
  }

  async disableVideo() {
    if (!this.localVideoTrack) return;
    const trackToDisable = this.localVideoTrack;
    for (const [pid, pc] of this.peerConnections) {
      try {
        const trefs = this.transceiversByPeer.get(pid);
        const v = trefs?.video;
        if (v) { try { await v.sender.replaceTrack(null); } catch {} }
        else {
          const sender = pc.getSenders().find(s => s.track === trackToDisable);
          if (sender) { try { await sender.replaceTrack(null); } catch {} }
        }
      } catch {}
    }
    try { this.localStream?.removeTrack(trackToDisable); } catch {}
    try { trackToDisable.stop(); } catch {}
    this.localVideoTrack = null;
    this.streamCb('self', this.localStream!);
  }

  async enableScreenShare(constraints?: MediaTrackConstraints) {
    let displayStream: MediaStream;
    try {
      displayStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: {
          frameRate: constraints?.frameRate ?? { ideal: 30 },
          width: constraints?.width ?? { ideal: 1920 },
          height: constraints?.height ?? { ideal: 1080 }
        },
        audio: false
      });
    } catch (e: any) {
      const name = e?.name || '';
      const message = name === 'NotAllowedError' ? 'ScreenShare permission denied' : 'ScreenShare failed';
      throw new Error(message);
    }
    const [screenTrack] = displayStream.getVideoTracks();
    if (!screenTrack) return;
    try { (screenTrack as any).contentHint = 'detail'; } catch {}
    this.localScreenTrack = screenTrack;
    this.localScreenStream = new MediaStream([screenTrack]);
    for (const [pid, pc] of this.peerConnections) {
      try {
        const trefs = this.transceiversByPeer.get(pid);
        const s = trefs?.screen;
        if (s) { try { await s.sender.replaceTrack(screenTrack); } catch {} }
        else {
          // fallback если нет предсозданного трансивера
          const sender = pc.getSenders().find(x => x.track && x.track.kind === 'video' && (x as any)._isScreen);
          if (sender) { try { await sender.replaceTrack(screenTrack); } catch {} }
          else { try { pc.addTrack(screenTrack, this.localScreenStream); } catch {} }
        }
        this.send({ type: 'screen-start', to: pid, data: { trackId: screenTrack.id } });
      } catch {}
    }
    await this.setScreenQuality(this.screenQuality);
    const onEnded = () => { this.disableScreenShare().catch(() => {}); };
    try { screenTrack.addEventListener('ended', onEnded); } catch {}
    this.streamCb('self:screen', this.localScreenStream);
  }

  async disableScreenShare() {
    if (!this.localScreenTrack) return;
    for (const [pid, pc] of this.peerConnections) {
      try {
        const trefs = this.transceiversByPeer.get(pid);
        const s = trefs?.screen;
        if (s) { try { await s.sender.replaceTrack(null); } catch {} }
        else {
          const sender = pc.getSenders().find(x => x.track === this.localScreenTrack);
          if (sender) { try { await sender.replaceTrack(null); } catch {} }
        }
      } catch {}
      try { this.send({ type: 'screen-stop', to: pid }); } catch {}
    }
    try { this.localScreenTrack.stop(); } catch {}
    this.localScreenTrack = null;
    this.localScreenStream = null;
    this.streamCb('self:screen', null);
  }

  async setScreenQuality(quality: 'low' | 'medium' | 'high') {
    this.screenQuality = quality;
    if (!this.localScreenTrack) return;
    const kbps = quality === 'low' ? 600 : quality === 'medium' ? 1200 : 2500;
    const scale = quality === 'low' ? 2 : quality === 'medium' ? 1.25 : 1;
    for (const [, pc] of this.peerConnections) {
      try {
        const sender = pc.getSenders().find(s => s.track === this.localScreenTrack);
        if (!sender) continue;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{} as RTCRtpEncodingParameters];
        params.encodings[0].maxBitrate = kbps * 1000;
        (params.encodings[0] as any).scaleResolutionDownBy = scale;
        await sender.setParameters(params);
      } catch {}
    }
  }

  async listVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(d => d.kind === 'videoinput').map(d => ({ id: d.deviceId, label: d.label }));
  }

  async setCameraDevice(deviceId: string) {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } }, audio: false });
    const [track] = stream.getVideoTracks();
    if (!track) return;
    if (!this.localStream) this.localStream = new MediaStream();
    if (this.localVideoTrack) {
      try { this.localStream.removeTrack(this.localVideoTrack); } catch {}
      try { this.localVideoTrack.stop(); } catch {}
    }
    this.localVideoTrack = track;
    this.localStream.addTrack(track);
    for (const [, pc] of this.peerConnections) {
      const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender) {
        try { await sender.replaceTrack(track); } catch {}
      } else {
        try { pc.addTrack(track, this.localStream); } catch {}
      }
    }
    this.streamCb('self', this.localStream);
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    this.ws.onopen = async () => {
      this.reconnectAttempt = 0;
      console.info('[CallService] WS connected');
      try { this.send({ type: 'join', roomId: this.roomId, peerId: this.selfId }); } catch {}
      if (this.localScreenTrack && this.localScreenStream) {
        for (const [pid, pc] of this.peerConnections) {
          try {
            const hasSender = pc.getSenders().some(s => s.track === this.localScreenTrack);
            if (!hasSender) {
              try { pc.addTrack(this.localScreenTrack, this.localScreenStream); } catch {}
            }
            if (this.selfId > pid) {
              try {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                this.send({ type: 'offer', to: pid, data: offer });
              } catch {}
            }
          } catch {}
        }
        this.setScreenQuality(this.screenQuality).catch(() => {});
      }
    };
    this.ws.onmessage = async (ev) => {
      // eslint-disable-next-line no-console
      console.debug('[CallService] WS message', ev.data);
      const msg: SignalingMessage = JSON.parse(ev.data);
      if (msg.type === 'peers' && Array.isArray(msg.peers)) {
        for (const pid of msg.peers) await this.createOfferTo(pid);
      } else if (msg.type === 'peer-joined' && msg.peerId && msg.peerId !== this.selfId) {
        await this.createOfferTo(msg.peerId);
      } else if (msg.type === 'offer' && msg.from) {
        await this.handleOffer(msg.from, msg.data);
      } else if (msg.type === 'answer' && msg.from) {
        await this.handleAnswer(msg.from, msg.data);
      } else if (msg.type === 'candidate' && msg.from) {
        await this.handleCandidate(msg.from, msg.data);
      } else if (msg.type === 'peer-left' && msg.peerId) {
        this.makingOffer.delete(msg.peerId);
        this.expectedScreenByPeer.delete(msg.peerId);
        this.closePeer(msg.peerId);
      } else if (msg.type === 'screen-start' && msg.from) {
        const tid = msg.data?.trackId as string | undefined;
        this.expectedScreenByPeer.set(msg.from, tid || null);
      } else if (msg.type === 'screen-stop' && msg.from) {
        this.expectedScreenByPeer.delete(msg.from);
        this.streamCb(`${msg.from}:screen`, null);
      }
    };
    this.ws.onclose = () => {
      console.warn('[CallService] WS closed');
      if (!this.reconnect) return;
      const timeout = Math.min(10000, 500 * Math.pow(2, this.reconnectAttempt++));
      setTimeout(() => {
        this.connect().catch(() => {});
      }, timeout);
    };
    this.ws.onerror = (e) => {
      console.error('[CallService] WS error', e);
    };
  }

  async disconnect() {
    this.reconnect = false;
    try { this.send({ type: 'leave' }); } catch {}
    for (const [pid, pc] of this.peerConnections) {
      pc.close();
      this.peerConnections.delete(pid);
      this.streamCb(pid, null);
    }
    try { this.ws.close(); } catch {}
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
  }

  private async ensurePeer(pid: PeerId): Promise<RTCPeerConnection> {
    let pc = this.peerConnections.get(pid);
    if (!pc) {
      pc = new RTCPeerConnection(this.rtcConfig);
      this.peerConnections.set(pid, pc);
      // Предсоздаём трансиверы в фиксированном порядке: 0-audio, 1-video(camera), 2-video(screen)
      const audioT = pc.addTransceiver('audio', { direction: 'sendrecv' });
      const videoT = pc.addTransceiver('video', { direction: 'sendrecv' });
      const screenT = pc.addTransceiver('video', { direction: 'sendrecv' });
      this.transceiversByPeer.set(pid, { audio: audioT, video: videoT, screen: screenT });
      // Заполняем локальными треками, если уже есть
      try {
        const audioTrack = this.localStream?.getAudioTracks()[0];
        if (audioTrack) { await audioT.sender.replaceTrack(audioTrack); }
      } catch {}
      try {
        if (this.localVideoTrack) { await videoT.sender.replaceTrack(this.localVideoTrack); }
      } catch {}
      try {
        if (this.localScreenTrack) { await screenT.sender.replaceTrack(this.localScreenTrack); }
      } catch {}
      pc.onnegotiationneeded = async () => {
        try {
          this.makingOffer.set(pid, true);
          const offer = await pc!.createOffer();
          await pc!.setLocalDescription(offer);
          this.send({ type: 'offer', to: pid, data: offer });
        } catch (e) {
          console.warn('[CallService] negotiationneeded failed', e);
        } finally {
          this.makingOffer.set(pid, false);
        }
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) this.send({ type: 'candidate', to: pid, data: e.candidate });
      };
      pc.ontrack = (e) => {
        const [stream] = e.streams;
        if (!stream) return;
        const track = e.track;
        const label = (track && (track.label || '')).toLowerCase();
        const expectedId = this.expectedScreenByPeer.get(pid);
        const trefs = this.transceiversByPeer.get(pid);
        const isScreenByMid = !!(trefs && e.transceiver && (e.transceiver === trefs.screen || (trefs.screen && e.transceiver.mid === trefs.screen.mid)));
        const looksLikeScreenByLabel = label.includes('screen') || label.includes('window') || label.includes('display');
        const looksLikeScreenByAudio = stream.getAudioTracks().length === 0;
        const isScreen = track.kind === 'video' && (isScreenByMid || track.id === expectedId || looksLikeScreenByLabel || looksLikeScreenByAudio);
        if (track.id === expectedId) this.expectedScreenByPeer.delete(pid);
        if (isScreen) {
          this.streamCb(`${pid}:screen`, stream);
          try { track.addEventListener('ended', () => this.streamCb(`${pid}:screen`, null)); } catch {}
          try { track.addEventListener('mute', () => this.streamCb(`${pid}:screen`, null)); } catch {}
    } else {
          this.streamCb(pid, stream);
          try {
            const handleOff = () => {
              try {
                const audios = stream.getAudioTracks();
                const newStream = audios.length ? new MediaStream(audios) : null;
                this.streamCb(pid, newStream);
              } catch {
                this.streamCb(pid, null);
              }
            };
            track.addEventListener('ended', handleOff);
            track.addEventListener('mute', handleOff);
            track.addEventListener('unmute', () => this.streamCb(pid, stream));
          } catch {}
        }
      };
      pc.onconnectionstatechange = () => {
        console.info('[CallService] peer state', pid, pc?.connectionState);
        if (!pc) return;
        if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          this.closePeer(pid);
        }
        // Для 'disconnected' дадим шанс на ICE рестарт/восстановление
      };
    }
    return pc;
  }

  private async createOfferTo(pid: PeerId) {
    // детерминированный инициатор — только тот, у кого selfId > pid
    if (!(this.selfId > pid)) return;
    const pc = await this.ensurePeer(pid);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.send({ type: 'offer', to: pid, data: offer });
  }

  private async handleOffer(from: PeerId, sdp: any) {
    const pc = await this.ensurePeer(from);
    const polite = this.selfId > from;
    if (pc.signalingState !== 'stable') {
      if (!polite && this.makingOffer.get(from)) {
        return; // неполитный и сам делает offer — игнор
      }
      try { await pc.setLocalDescription({ type: 'rollback' } as any); } catch {}
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      console.warn('[CallService] setRemoteDescription(offer) failed', e);
      return;
    }
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    this.send({ type: 'answer', to: from, data: answer });
  }

  private async handleAnswer(from: PeerId, sdp: any) {
    const pc = await this.ensurePeer(from);
    // принимать answer только когда "have-local-offer"
    if (pc.signalingState !== 'have-local-offer') {
      console.warn('[CallService] Ignore unexpected answer in state', pc.signalingState);
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(sdp));
    } catch (e) {
      console.warn('[CallService] setRemoteDescription(answer) failed', e);
    }
  }

  private async handleCandidate(from: PeerId, candidate: any) {
    const pc = await this.ensurePeer(from);
    try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
  }

  private closePeer(pid: PeerId) {
    const pc = this.peerConnections.get(pid);
    if (pc) {
      try { pc.close(); } catch {}
      this.peerConnections.delete(pid);
      this.streamCb(pid, null);
    }
  }

  private send(msg: SignalingMessage) {
    this.ws.send(JSON.stringify(msg));
  }
}


