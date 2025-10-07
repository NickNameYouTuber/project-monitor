import { ICE_SERVERS } from '../utils/constants';
import socketService, { ConnectionType } from './socketService';

// RTC конфигурация
const RTC_CONFIG = {
  iceServers: ICE_SERVERS
};

// Ограничения медиа по умолчанию
const DEFAULT_MEDIA_CONSTRAINTS = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  }
};

interface PeerConnectionBundle {
  audio: RTCPeerConnection;
  video: RTCPeerConnection;
  screen?: RTCPeerConnection; // Отдельный peer connection для screen share
}

export type RemoteStreamType = 'audio' | 'video' | 'screen';

class WebRTCService {
  private peerConnections: Map<string, PeerConnectionBundle> = new Map();

  private localAudioStream: MediaStream | null = null;
  private localVideoStream: MediaStream | null = null;
  private localCompositeStream: MediaStream | null = null;
  private localAudioTrack: MediaStreamTrack | null = null;
  private localVideoTrack: MediaStreamTrack | null = null;
  private screenStream: MediaStream | null = null;

  private remoteVideoStreams: Map<string, MediaStream> = new Map();
  private remoteAudioStreams: Map<string, MediaStream> = new Map();
  private remoteScreenStreams: Map<string, MediaStream> = new Map();
  private remoteSocketIdToScreenStreamId: Map<string, string> = new Map();
  private peersExpectingScreen: Set<string> = new Set();

  private onRemoteVideoStreamCallback: ((socketId: string, stream: MediaStream) => void) | null = null;
  private onRemoteAudioStreamCallback: ((socketId: string, stream: MediaStream) => void) | null = null;
  private onRemoteScreenStreamCallback: ((socketId: string, stream: MediaStream) => void) | null = null;
  private onRemoteStreamRemovedCallback: ((socketId: string) => void) | null = null;
  private onLocalStreamUpdatedCallback: (() => void) | null = null;

  async initializeLocalStream(): Promise<MediaStream> {
    const compositeStream = new MediaStream();

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: DEFAULT_MEDIA_CONSTRAINTS.audio || true });
      this.localAudioStream = audioStream;
      this.localAudioTrack = audioStream.getAudioTracks()[0] || null;
      if (this.localAudioTrack) {
        compositeStream.addTrack(this.localAudioTrack);
      }
      console.log('Аудио поток получен успешно');
    } catch (audioError) {
      console.warn('Не удалось получить аудио поток, продолжаем без микрофона:', audioError);
      this.localAudioStream = new MediaStream();
      this.localAudioTrack = null;
    }

    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: DEFAULT_MEDIA_CONSTRAINTS.video || true });
      this.localVideoStream = videoStream;
      this.localVideoTrack = videoStream.getVideoTracks()[0] || null;
      if (this.localVideoTrack) {
        compositeStream.addTrack(this.localVideoTrack);
      }
      console.log('Видео поток получен успешно');
    } catch (videoError) {
      console.warn('Не удалось получить видео поток, продолжаем без камеры:', videoError);
      this.localVideoStream = new MediaStream();
      this.localVideoTrack = null;
    }

    this.localCompositeStream = compositeStream;
    if (this.onLocalStreamUpdatedCallback) {
      this.onLocalStreamUpdatedCallback();
    }

    return compositeStream;
  }

  getLocalStream(): MediaStream | null {
    return this.localCompositeStream;
  }

  getLocalVideoStream(): MediaStream | null {
    return this.localVideoStream;
  }

  getLocalAudioStream(): MediaStream | null {
    return this.localAudioStream;
  }

  getRemoteVideoStreams(): Map<string, MediaStream> {
    return this.remoteVideoStreams;
  }

  getRemoteAudioStreams(): Map<string, MediaStream> {
    return this.remoteAudioStreams;
  }

  getRemoteScreenStreams(): Map<string, MediaStream> {
    return this.remoteScreenStreams;
  }

  getLocalScreenStream(): MediaStream | null {
    return this.screenStream;
  }

  private ensureCompositeStream(): void {
    if (!this.localCompositeStream) {
      this.localCompositeStream = new MediaStream();
    }

    const compositeTracks = this.localCompositeStream.getTracks();
    if (this.localAudioTrack && !compositeTracks.includes(this.localAudioTrack)) {
      this.localCompositeStream.addTrack(this.localAudioTrack);
    }
    if (this.localVideoTrack && !compositeTracks.includes(this.localVideoTrack)) {
      this.localCompositeStream.addTrack(this.localVideoTrack);
    }
  }

  private createPeerConnection(remoteSocketId: string, connectionType: ConnectionType): RTCPeerConnection {
    const peerConnection = new RTCPeerConnection(RTC_CONFIG);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidate = event.candidate;
        // Логируем тип ICE кандидата для отладки
        console.log(`🧊 ICE кандидат (${connectionType}) для ${remoteSocketId}:`, {
          type: candidate.type, // host/srflx/relay
          protocol: candidate.protocol, // udp/tcp
          address: candidate.address,
          port: candidate.port,
          priority: candidate.priority
        });
        socketService.sendIceCandidate(remoteSocketId, candidate.toJSON(), connectionType);
      } else {
        console.log(`✅ ICE gathering завершен (${connectionType}) для ${remoteSocketId}`);
      }
    };

    peerConnection.onicegatheringstatechange = () => {
      console.log(`🔍 ICE gathering state (${connectionType}) для ${remoteSocketId}:`, peerConnection.iceGatheringState);
    };

    peerConnection.oniceconnectionstatechange = () => {
      console.log(`🔗 ICE connection state (${connectionType}) для ${remoteSocketId}:`, peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === 'failed') {
        console.error(`❌ ICE connection failed (${connectionType}) для ${remoteSocketId} - пробуем ICE restart`);
        this.createOffer(remoteSocketId, connectionType, { iceRestart: true })
          .catch((error) => console.warn(`ICE restart (${connectionType}) для ${remoteSocketId} не удался:`, error));
      }
    };

    peerConnection.onconnectionstatechange = () => {
      console.log(`📡 Connection state (${connectionType}) для ${remoteSocketId}:`, peerConnection.connectionState);
      if (peerConnection.connectionState === 'failed') {
        console.error(`❌ Connection failed (${connectionType}) для ${remoteSocketId}`);
        // Пробуем повторное соединение
        setTimeout(() => {
          if (peerConnection.connectionState === 'failed') {
            console.log(`🔄 Пытаюсь переподключить (${connectionType}) к ${remoteSocketId}`);
            this.createOffer(remoteSocketId, connectionType, { iceRestart: true })
              .catch((error) => console.warn(`Переподключение не удалось:`, error));
          }
        }, 2000);
      }
    };

    if (connectionType === 'video') {
      peerConnection.ontrack = (event) => {
        const [incomingStream] = event.streams;
        const track = event.track;
        if (!incomingStream || track.kind !== 'video') {
          return;
        }

        // Video connection только для КАМЕРЫ
        let videoStream = this.remoteVideoStreams.get(remoteSocketId);
        if (!videoStream) {
          videoStream = new MediaStream();
          this.remoteVideoStreams.set(remoteSocketId, videoStream);
        }
        videoStream.getVideoTracks().forEach((videoTrack) => videoStream!.removeTrack(videoTrack));
        videoStream.addTrack(track);
        if (this.onRemoteVideoStreamCallback) {
          this.onRemoteVideoStreamCallback(remoteSocketId, videoStream);
        }
      };
    }

    if (connectionType === 'audio') {
      peerConnection.ontrack = (event) => {
        const [incomingStream] = event.streams;
        const track = event.track;
        if (!incomingStream || track.kind !== 'audio') {
          return;
        }

        let audioStream = this.remoteAudioStreams.get(remoteSocketId);
        if (!audioStream) {
          audioStream = new MediaStream();
          this.remoteAudioStreams.set(remoteSocketId, audioStream);
        }
        audioStream.getAudioTracks().forEach((audioTrack) => audioStream!.removeTrack(audioTrack));
        audioStream.addTrack(track);
        if (this.onRemoteAudioStreamCallback) {
          this.onRemoteAudioStreamCallback(remoteSocketId, audioStream);
        }
      };
    }

    if (connectionType === 'screen') {
      peerConnection.ontrack = (event) => {
        const [incomingStream] = event.streams;
        const track = event.track;
        if (!incomingStream || track.kind !== 'video') {
          return;
        }

        console.log(`📺 Получен screen track от ${remoteSocketId}`);
        let screenStream = this.remoteScreenStreams.get(remoteSocketId);
        if (!screenStream) {
          screenStream = new MediaStream();
          this.remoteScreenStreams.set(remoteSocketId, screenStream);
        }
        screenStream.getVideoTracks().forEach((videoTrack) => screenStream!.removeTrack(videoTrack));
        screenStream.addTrack(track);
        if (this.onRemoteScreenStreamCallback) {
          this.onRemoteScreenStreamCallback(remoteSocketId, screenStream);
        }
      };
    }

    return peerConnection;
  }

  getPeerConnection(remoteSocketId: string, connectionType: ConnectionType): RTCPeerConnection {
    let bundle = this.peerConnections.get(remoteSocketId);
    if (!bundle) {
      bundle = {
        audio: this.createPeerConnection(remoteSocketId, 'audio'),
        video: this.createPeerConnection(remoteSocketId, 'video')
      };
      this.peerConnections.set(remoteSocketId, bundle);
    }

    // Создаем screen connection по требованию
    if (connectionType === 'screen') {
      if (!bundle.screen) {
        bundle.screen = this.createPeerConnection(remoteSocketId, 'screen');
        this.peerConnections.set(remoteSocketId, bundle);
      }
      return bundle.screen;
    }

    if (!bundle[connectionType]) {
      bundle[connectionType] = this.createPeerConnection(remoteSocketId, connectionType);
    }

    return bundle[connectionType];
  }

  private async ensureLocalTrackAttached(remoteSocketId: string, connectionType: ConnectionType): Promise<void> {
    const peerConnection = this.getPeerConnection(remoteSocketId, connectionType);
    if (connectionType === 'audio') {
      if (this.localAudioTrack) {
        const existingSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'audio');
        if (!existingSender) {
          peerConnection.addTrack(this.localAudioTrack, this.localAudioStream || new MediaStream([this.localAudioTrack]));
        } else if (existingSender.track !== this.localAudioTrack) {
          await existingSender.replaceTrack(this.localAudioTrack);
        }
      } else if (!peerConnection.getTransceivers().some((tr) => tr.receiver.track?.kind === 'audio')) {
        peerConnection.addTransceiver('audio', { direction: 'recvonly' });
      }
    }

    if (connectionType === 'video') {
      if (this.localVideoTrack) {
        const videoSenders = peerConnection.getSenders().filter((sender) => sender.track?.kind === 'video');
        const cameraSender = videoSenders.find((sender) => sender.track?.id === this.localVideoTrack?.id);
        if (!cameraSender) {
          peerConnection.addTrack(this.localVideoTrack, this.localVideoStream || new MediaStream([this.localVideoTrack]));
        }
      } else if (!peerConnection.getTransceivers().some((tr) => tr.receiver.track?.kind === 'video')) {
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }
    }

    // Screen sharing идет через ОТДЕЛЬНЫЙ peer connection
    if (connectionType === 'screen') {
      if (this.screenStream) {
        const screenTrack = this.screenStream.getVideoTracks()[0];
        if (screenTrack) {
          const existingSender = peerConnection.getSenders().find((sender) => sender.track?.kind === 'video');
          if (!existingSender) {
            peerConnection.addTrack(screenTrack, this.screenStream);
            console.log(`📺 Добавлен screen track для ${remoteSocketId}`);
          } else if (existingSender.track !== screenTrack) {
            await existingSender.replaceTrack(screenTrack);
            console.log(`📺 Заменен screen track для ${remoteSocketId}`);
          }
        }
      } else if (!peerConnection.getTransceivers().some((tr) => tr.receiver.track?.kind === 'video')) {
        peerConnection.addTransceiver('video', { direction: 'recvonly' });
      }
    }
  }

  async createOffer(remoteSocketId: string, connectionType: ConnectionType, options?: RTCOfferOptions): Promise<void> {
    const peerConnection = this.getPeerConnection(remoteSocketId, connectionType);

    await this.ensureLocalTrackAttached(remoteSocketId, connectionType);

    try {
      const currentState = peerConnection.signalingState;
      if (currentState === 'stable') {
        const offer = await peerConnection.createOffer(options);
        await peerConnection.setLocalDescription(offer);
        console.log(`📤 Отправляю offer (${connectionType}) к ${remoteSocketId}`);
        socketService.sendOffer(remoteSocketId, offer, connectionType);
      } else {
        console.log(`⏭️ Пропускаем создание offer (${connectionType}) для ${remoteSocketId}, состояние: ${currentState}`);
      }
    } catch (error) {
      console.error(`Ошибка создания offer (${connectionType}) для ${remoteSocketId}:`, error);
    }
  }

  async handleOffer(remoteSocketId: string, offer: RTCSessionDescriptionInit, connectionType: ConnectionType): Promise<void> {
    const peerConnection = this.getPeerConnection(remoteSocketId, connectionType);

    try {
      console.log(`📥 Получен offer (${connectionType}) от ${remoteSocketId}, текущее состояние: ${peerConnection.signalingState}`);
      
      // Perfect Negotiation: обрабатываем "glare" (обе стороны отправили offer)
      const mySocketId = socketService.getSocket()?.id || '';
      const isPolite = mySocketId < remoteSocketId; // Меньший socketId = polite peer
      const isGlare = peerConnection.signalingState === 'have-local-offer';
      
      if (isGlare && !isPolite) {
        // Impolite peer при glare: игнорируем входящий offer, продолжаем со своим
        console.warn(`⚠️ Impolite peer (glare): игнорирую offer (${connectionType}) от ${remoteSocketId}, у меня свой offer (myId: ${mySocketId})`);
        return;
      }
      
      // Polite peer при glare: откатываем свой offer
      if (isGlare && isPolite) {
        console.log(`🔄 Polite peer (glare): откатываю свой offer (${connectionType}), принимаю от ${remoteSocketId} (myId: ${mySocketId})`);
        // Откатываем локальный offer через rollback
        await peerConnection.setLocalDescription({ type: 'rollback' } as RTCSessionDescriptionInit);
      }
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      await this.ensureLocalTrackAttached(remoteSocketId, connectionType);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      console.log(`📤 Отправляю answer (${connectionType}) к ${remoteSocketId}`);
      socketService.sendAnswer(remoteSocketId, answer, connectionType);
    } catch (error) {
      console.error(`Ошибка обработки offer (${connectionType}) от ${remoteSocketId}:`, error);
    }
  }

  async handleAnswer(remoteSocketId: string, answer: RTCSessionDescriptionInit, connectionType: ConnectionType): Promise<void> {
    const peerConnection = this.getPeerConnection(remoteSocketId, connectionType);
    try {
      const currentState = peerConnection.signalingState;
      console.log(`📥 Получен answer (${connectionType}) от ${remoteSocketId}, текущее состояние: ${currentState}`);
      
      // Принимаем answer только если мы отправили offer
      if (currentState === 'have-local-offer') {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`✅ Применен answer (${connectionType}) от ${remoteSocketId}`);
      } else if (currentState === 'stable') {
        console.warn(`⚠️ Игнорируем answer (${connectionType}) от ${remoteSocketId}, уже в stable (возможно, был glare и мы polite peer)`);
      } else {
        console.warn(`⚠️ Неожиданное состояние "${currentState}" при получении answer (${connectionType}) от ${remoteSocketId}`);
      }
    } catch (error) {
      console.error(`Ошибка обработки answer (${connectionType}) от ${remoteSocketId}:`, error);
    }
  }

  async handleIceCandidate(remoteSocketId: string, candidate: RTCIceCandidateInit, connectionType: ConnectionType): Promise<void> {
    const peerConnection = this.getPeerConnection(remoteSocketId, connectionType);
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Ошибка добавления ICE кандидата (${connectionType}) от ${remoteSocketId}:`, error);
    }
  }

  async toggleCamera(): Promise<boolean> {
    // Физическое отключение камеры
    if (this.localVideoTrack && this.localVideoStream) {
      console.log('Физически выключаем камеру (track.stop)');
      // Останавливаем все треки видео
      this.localVideoStream.getTracks().forEach(track => track.stop());
      this.localVideoTrack = null;
      this.localVideoStream = null;
      
      // Удаляем из композитного потока
      if (this.localCompositeStream) {
        this.localCompositeStream.getVideoTracks().forEach(track => {
          this.localCompositeStream!.removeTrack(track);
          track.stop();
        });
      }

      // Используем replaceTrack(null) вместо removeTrack - это НЕ требует renegotiation!
      // Это сохранит входящие потоки от других участников и не вызовет connecting
      const peerEntries = Array.from(this.peerConnections.entries());
      for (let index = 0; index < peerEntries.length; index++) {
        const [socketId, bundle] = peerEntries[index];
        if (bundle.video) {
          const senders = bundle.video.getSenders();
          for (const sender of senders) {
            if (sender.track && sender.track.kind === 'video') {
              try {
                await sender.replaceTrack(null); // БЕЗ renegotiation!
                console.log(`🗑️ Заменен video track на null для ${socketId} (без renegotiation)`);
              } catch (error) {
                console.warn(`Не удалось заменить track:`, error);
              }
            }
          }
        }
      }

      if (this.onLocalStreamUpdatedCallback) {
        this.onLocalStreamUpdatedCallback();
      }

      return false; // Камера выключена
    }

    // Физическое включение камеры
    try {
      console.log('Физически включаем камеру (getUserMedia)');
      const videoStream = await navigator.mediaDevices.getUserMedia({ video: DEFAULT_MEDIA_CONSTRAINTS.video || true });
      const track = videoStream.getVideoTracks()[0];
      if (!track) {
        return false;
      }
      this.localVideoStream = videoStream;
      this.localVideoTrack = track;
      this.ensureCompositeStream();

      // Используем replaceTrack для замены трека БЕЗ renegotiation
      const peerEntries = Array.from(this.peerConnections.entries());
      for (let index = 0; index < peerEntries.length; index++) {
        const [socketId, bundle] = peerEntries[index];
        if (bundle.video) {
          const senders = bundle.video.getSenders();
          let trackReplaced = false;
          for (const sender of senders) {
            if (sender.track === null || sender.track.kind === 'video') {
              try {
                await sender.replaceTrack(track); // БЕЗ renegotiation!
                console.log(`✅ Заменен video track для ${socketId} (без renegotiation)`);
                trackReplaced = true;
                break;
              } catch (error) {
                console.warn(`Не удалось заменить track:`, error);
              }
            }
          }
          // Если sender не нашелся (не было трека раньше), добавляем через addTrack
          if (!trackReplaced) {
            try {
              bundle.video.addTrack(track, this.localVideoStream!);
              console.log(`➕ Добавлен новый video track для ${socketId}`);
              await this.createOffer(socketId, 'video'); // Только если addTrack
            } catch (error) {
              console.warn(`Не удалось добавить track:`, error);
            }
          }
        }
      }

      if (this.onLocalStreamUpdatedCallback) {
        this.onLocalStreamUpdatedCallback();
      }

      return true; // Камера включена
    } catch (error) {
      console.error('Не удалось включить камеру:', error);
      return false;
    }
  }

  async toggleMicrophone(): Promise<boolean> {
    // Физическое отключение микрофона
    if (this.localAudioTrack && this.localAudioStream) {
      console.log('Физически выключаем микрофон (track.stop)');
      // Останавливаем все аудио треки
      this.localAudioStream.getTracks().forEach(track => track.stop());
      this.localAudioTrack = null;
      this.localAudioStream = null;
      
      // Удаляем из композитного потока
      if (this.localCompositeStream) {
        this.localCompositeStream.getAudioTracks().forEach(track => {
          this.localCompositeStream!.removeTrack(track);
          track.stop();
        });
      }

      // Используем replaceTrack(null) вместо removeTrack - это НЕ требует renegotiation!
      // Это сохранит входящие потоки от других участников и не вызовет connecting
      const peerEntries = Array.from(this.peerConnections.entries());
      for (let index = 0; index < peerEntries.length; index++) {
        const [socketId, bundle] = peerEntries[index];
        if (bundle.audio) {
          const senders = bundle.audio.getSenders();
          for (const sender of senders) {
            if (sender.track && sender.track.kind === 'audio') {
              try {
                await sender.replaceTrack(null); // БЕЗ renegotiation!
                console.log(`🗑️ Заменен audio track на null для ${socketId} (без renegotiation)`);
              } catch (error) {
                console.warn(`Не удалось заменить track:`, error);
              }
            }
          }
        }
      }

      if (this.onLocalStreamUpdatedCallback) {
        this.onLocalStreamUpdatedCallback();
      }

      return false; // Микрофон выключен
    }

    // Физическое включение микрофона
    try {
      console.log('Физически включаем микрофон (getUserMedia)');
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: DEFAULT_MEDIA_CONSTRAINTS.audio || true });
      const track = audioStream.getAudioTracks()[0];
      if (!track) {
        return false;
      }
      this.localAudioStream = audioStream;
      this.localAudioTrack = track;
      this.ensureCompositeStream();

      // Используем replaceTrack для замены трека БЕЗ renegotiation
      const peerEntries = Array.from(this.peerConnections.entries());
      for (let index = 0; index < peerEntries.length; index++) {
        const [socketId, bundle] = peerEntries[index];
        if (bundle.audio) {
          const senders = bundle.audio.getSenders();
          let trackReplaced = false;
          for (const sender of senders) {
            if (sender.track === null || sender.track.kind === 'audio') {
              try {
                await sender.replaceTrack(track); // БЕЗ renegotiation!
                console.log(`✅ Заменен audio track для ${socketId} (без renegotiation)`);
                trackReplaced = true;
                break;
              } catch (error) {
                console.warn(`Не удалось заменить track:`, error);
              }
            }
          }
          // Если sender не нашелся (не было трека раньше), добавляем через addTrack
          if (!trackReplaced) {
            try {
              bundle.audio.addTrack(track, this.localAudioStream!);
              console.log(`➕ Добавлен новый audio track для ${socketId}`);
              await this.createOffer(socketId, 'audio'); // Только если addTrack
            } catch (error) {
              console.warn(`Не удалось добавить track:`, error);
            }
          }
        }
      }

      if (this.onLocalStreamUpdatedCallback) {
        this.onLocalStreamUpdatedCallback();
      }

      return true; // Микрофон включен
    } catch (error) {
      console.error('Не удалось включить микрофон:', error);
      return false;
    }
  }

  async startScreenShare(): Promise<boolean> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) {
        return false;
      }

      screenTrack.onended = () => {
        this.stopScreenShare();
      };

      const roomId = (window as any).__NIM_CURRENT_ROOM_ID__;
      if (roomId) {
        try {
          socketService.notifyScreenShareStarted(roomId, this.screenStream.id);
        } catch (error) {
          console.warn('Не удалось оповестить о начале screen share:', error);
        }
      }

      // Screen sharing идет через ОТДЕЛЬНЫЙ 'screen' connection
      const peerEntries = Array.from(this.peerConnections.entries());
      for (let index = 0; index < peerEntries.length; index++) {
        const [socketId] = peerEntries[index];
        await this.ensureLocalTrackAttached(socketId, 'screen');
        await this.createOffer(socketId, 'screen');
        console.log(`📺 Отправляю screen offer к ${socketId}`);
      }

      return true;
    } catch (error) {
      console.error('Ошибка начала демонстрации экрана:', error);
      return false;
    }
  }

  stopScreenShare(): boolean {
    if (!this.screenStream) {
      return false;
    }

    this.screenStream.getTracks().forEach((track) => track.stop());
    this.screenStream = null;

    // Закрываем screen peer connections
    const peerEntries = Array.from(this.peerConnections.entries());
    for (let index = 0; index < peerEntries.length; index++) {
      const [socketId, bundle] = peerEntries[index];
      if (bundle.screen) {
        bundle.screen.close();
        delete bundle.screen;
        this.peerConnections.set(socketId, bundle);
        console.log(`📺 Закрыт screen connection для ${socketId}`);
      }
      // Удаляем screen stream из Map
      this.remoteScreenStreams.delete(socketId);
    }

    const roomId = (window as any).__NIM_CURRENT_ROOM_ID__;
    if (roomId) {
      try {
        socketService.notifyScreenShareStopped(roomId);
      } catch (error) {
        console.warn('Не удалось оповестить об окончании screen share:', error);
      }
    }

    return true;
  }

  closeConnection(remoteSocketId: string): void {
    const bundle = this.peerConnections.get(remoteSocketId);
    if (bundle) {
      bundle.audio.close();
      bundle.video.close();
      if (bundle.screen) {
        bundle.screen.close();
      }
      this.peerConnections.delete(remoteSocketId);
    }

    this.remoteVideoStreams.delete(remoteSocketId);
    this.remoteAudioStreams.delete(remoteSocketId);
    this.remoteScreenStreams.delete(remoteSocketId);

    if (this.onRemoteStreamRemovedCallback) {
      this.onRemoteStreamRemovedCallback(remoteSocketId);
    }
  }

  cleanupRemoteConnections(): void {
    console.log('Очищаю все удаленные соединения, но оставляю локальные потоки');
    // Закрываем все peer connections
    this.peerConnections.forEach((bundle) => {
      bundle.audio.close();
      bundle.video.close();
      if (bundle.screen) {
        bundle.screen.close();
      }
    });
    this.peerConnections.clear();

    // Очищаем удаленные потоки
    this.remoteVideoStreams.clear();
    this.remoteAudioStreams.clear();
    this.remoteScreenStreams.clear();
    this.remoteSocketIdToScreenStreamId.clear();
    this.peersExpectingScreen.clear();
  }

  cleanup(): void {
    this.peerConnections.forEach((bundle) => {
      bundle.audio.close();
      bundle.video.close();
    });
    this.peerConnections.clear();

    this.localAudioStream?.getTracks().forEach((track) => track.stop());
    this.localVideoStream?.getTracks().forEach((track) => track.stop());
    this.screenStream?.getTracks().forEach((track) => track.stop());

    this.localAudioStream = null;
    this.localVideoStream = null;
    this.localCompositeStream = null;
    this.localAudioTrack = null;
    this.localVideoTrack = null;
    this.screenStream = null;

    this.remoteVideoStreams.clear();
    this.remoteAudioStreams.clear();
    this.remoteScreenStreams.clear();
    this.remoteSocketIdToScreenStreamId.clear();
    this.peersExpectingScreen.clear();
  }

  onRemoteVideoStream(callback: (socketId: string, stream: MediaStream) => void): void {
    this.onRemoteVideoStreamCallback = callback;
  }

  onRemoteAudioStream(callback: (socketId: string, stream: MediaStream) => void): void {
    this.onRemoteAudioStreamCallback = callback;
  }

  onRemoteScreenStream(callback: (socketId: string, stream: MediaStream) => void): void {
    this.onRemoteScreenStreamCallback = callback;
  }

  onRemoteStreamRemoved(callback: (socketId: string) => void): void {
    this.onRemoteStreamRemovedCallback = callback;
  }

  onLocalStreamUpdated(callback: () => void): void {
    this.onLocalStreamUpdatedCallback = callback;
  }

  setAnnouncedScreenStreamId(remoteSocketId: string, streamId: string): void {
    this.remoteSocketIdToScreenStreamId.set(remoteSocketId, streamId);
  }

  clearAnnouncedScreenStreamId(remoteSocketId: string): void {
    this.remoteSocketIdToScreenStreamId.delete(remoteSocketId);
    this.remoteScreenStreams.delete(remoteSocketId);
    this.peersExpectingScreen.delete(remoteSocketId);
    if (this.onRemoteStreamRemovedCallback) {
      this.onRemoteStreamRemovedCallback(remoteSocketId);
    }
  }

  markPeerExpectsScreen(remoteSocketId: string): void {
    this.peersExpectingScreen.add(remoteSocketId);
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;

