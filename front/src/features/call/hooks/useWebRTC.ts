import { useState, useEffect, useCallback, useRef } from 'react';
import webrtcService from '../services/webrtcService';
import socketService from '../services/socketService';
import authService from '../services/authService';
import roomService from '../services/roomService';
import { useAuth } from './useAuth';
import { Participant } from '../types/call.types';

export const useWebRTC = (roomId: string, guestName?: string) => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    senderId: string;
    senderName: string;
    message: string;
    timestamp: number;
    isOwnMessage?: boolean;
  }>>([]);
  const isInitialized = useRef(false);
  const offersCreated = useRef<Set<string>>(new Set());
  const guestId = useRef<string>(`guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);

  const handleRemoteVideoStream = useCallback((socketId: string, stream: MediaStream) => {
    const mySocketId = socketService.getSocket()?.id;
    if (socketId === mySocketId) {
      return;
    }
    setRemoteVideoStreams((prev) => {
      const next = new Map(prev);
      const normalizedStream = new MediaStream(stream.getVideoTracks());
      next.set(socketId, normalizedStream);
      return next;
    });
    setParticipants((prev) => {
      const next = new Map(prev);
      const participant = next.get(socketId);
      if (participant) {
        participant.hasVideo = stream.getVideoTracks().some((track) => track.enabled);
        next.set(socketId, { ...participant });
      }
      return next;
    });
  }, []);

  const handleRemoteStreamRemoved = useCallback((socketId: string) => {
    setRemoteVideoStreams((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
    setRemoteAudioStreams((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
    setRemoteScreenStreams((prev) => {
      const next = new Map(prev);
      next.delete(socketId);
      return next;
    });
    setParticipants((prev) => {
      const next = new Map(prev);
      const participant = next.get(socketId);
      if (participant) {
        participant.hasVideo = false;
        participant.hasAudio = false;
        participant.mediaState.screen = false;
        next.set(socketId, { ...participant });
      }
      return next;
    });
  }, []);

  const initializeMedia = useCallback(async () => {
    if (isInitialized.current) return;
    if (!user && !guestName) {
      console.log('User и guestName не загружены, ожидаем...');
      return;
    }
    
    isInitialized.current = true;
    const displayName = user?.username || guestName || 'Гость';
    console.log('Инициализация медиа для пользователя:', displayName);

    try {
      const stream = await webrtcService.initializeLocalStream();
      setLocalStream(stream);
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      setIsCameraEnabled(videoTracks.length > 0 && videoTracks[0].enabled);
      setIsMicrophoneEnabled(audioTracks.length > 0 && audioTracks[0].enabled);
    } catch (error) {
      console.error('Ошибка инициализации медиа, продолжаем без медиа:', error);
      setLocalStream(new MediaStream());
      setIsCameraEnabled(false);
      setIsMicrophoneEnabled(false);
    }

    webrtcService.onRemoteVideoStream(handleRemoteVideoStream);
    webrtcService.onRemoteAudioStream((socketId, stream) => {
      setRemoteAudioStreams((prev) => {
        const next = new Map(prev);
        const normalizedStream = new MediaStream(stream.getAudioTracks());
        next.set(socketId, normalizedStream);
        return next;
      });
      setParticipants((prev) => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          participant.hasAudio = stream.getAudioTracks().some((track) => track.enabled);
          next.set(socketId, { ...participant });
        }
        return next;
      });
    });
    webrtcService.onRemoteScreenStream((socketId, stream) => {
      setRemoteScreenStreams((prev) => {
        const next = new Map(prev);
        const normalizedStream = new MediaStream(stream.getVideoTracks());
        next.set(socketId, normalizedStream);
        return next;
      });
      setParticipants((prev) => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          participant.mediaState.screen = stream.getVideoTracks().length > 0;
          next.set(socketId, { ...participant });
        }
        return next;
      });
    });
    webrtcService.onRemoteStreamRemoved(handleRemoteStreamRemoved);
    
    // Обновляем локальный поток при изменении треков
    webrtcService.onLocalStreamUpdated(() => {
      const currentStream = webrtcService.getLocalStream();
      if (currentStream) {
        setLocalStream(new MediaStream(currentStream.getTracks()));
      }
    });

    // Используем JWT токен PM для авторизованных пользователей
    const token = authService.getToken();
    const isGuest = !user || !token;
    const userIdToUse = user?.id || guestId.current;
    const usernameToUse = user?.username || guestName || 'Guest';

    console.log('🔍 WebRTC инициализация:', {
      hasToken: !!token,
      isGuest,
      userId: userIdToUse,
      username: usernameToUse,
      roomId
    });

    if (token || isGuest) {
      console.log(`✅ Условие подключения выполнено, подключаемся к Socket.IO (${isGuest ? 'гостевой режим' : 'авторизованный пользователь PM'})`);
      const socket = isGuest ? socketService.connectAsGuest() : socketService.connect(token!);
      
      // Присоединяемся к комнате (socketService автоматически повторит при переподключении)
      console.log('🔌 Присоединяюсь к комнате:', roomId);
      socketService.joinRoom(roomId, {
        userId: userIdToUse,
        username: usernameToUse,
      });
      (window as any).__NIM_CURRENT_ROOM_ID__ = roomId;

      socket.on('reconnect', () => {
        console.log('Срабатывает обработчик reconnect — очищаю старые удаленные соединения');
        offersCreated.current.clear();
        
        // Очищаем только удаленные соединения, локальные потоки оставляем
        webrtcService.cleanupRemoteConnections();
        
        // Очищаем списки участников и потоков
        setParticipants(new Map());
        setRemoteVideoStreams(new Map());
        setRemoteAudioStreams(new Map());
        setRemoteScreenStreams(new Map());
        
        console.log('✅ Старые удаленные данные очищены, локальные потоки сохранены, ожидаем новый список участников');
        // socketService автоматически повторит join-room
      });

      socket.on('join-timeout', (data) => {
        console.error('⏰ Таймаут присоединения к комнате:', data);
        setError('Не удалось присоединиться к комнате');
      });
    } else {
      console.error('❌ Не удается подключиться: нет токена и не гость');
      console.log('🔍 Детали:', { token: !!token, user: !!user, isGuest });
    }

    socketService.onUserJoined(({ participant }) => {
      const mySocketId = socketService.getSocket()?.id;
      if (participant.socketId === mySocketId) {
        console.log('Игнорируем событие о самом себе');
        return;
      }

      console.log('Новый участник присоединился:', participant);

      setParticipants((prev) => {
        const newParticipants = new Map(prev);
        
        // ВАЖНО: Удаляем все старые socketId этого пользователя (по userId)
        // Это нужно на случай если пользователь переподключился с новым socketId
        const entriesToCheck = Array.from(newParticipants.entries());
        let removedOldSockets = 0;
        entriesToCheck.forEach(([socketId, p]) => {
          if (p.userId === participant.userId && socketId !== participant.socketId) {
            console.log(`🧹 Удаляю старый socketId ${socketId} для пользователя ${p.username} (новый: ${participant.socketId})`);
            newParticipants.delete(socketId);
            // Закрываем соединения со старым socketId
            webrtcService.closeConnection(socketId);
            removedOldSockets++;
          }
        });
        
        if (!newParticipants.has(participant.socketId)) {
          newParticipants.set(participant.socketId, participant);
          console.log(`✅ Добавлен новый участник ${participant.username} (${participant.socketId}), удалено старых: ${removedOldSockets}`);
        } else {
          console.log('Участник уже в списке:', participant.socketId);
        }
        
        console.log('📊 Участников в map после обновления:', newParticipants.size, 'socketIds:', Array.from(newParticipants.keys()));
        return newParticipants;
      });

      // Как СТАРЫЙ участник, отправляем offers новому участнику
      console.log('Отправляю offers новому участнику:', participant.socketId);
      webrtcService.createOffer(participant.socketId, 'video');
      webrtcService.createOffer(participant.socketId, 'audio');
      
      // Дополнительная пересылка через 500мс для надежности передачи треков
      setTimeout(() => {
        console.log('🔄 Повторная отправка треков новому участнику:', participant.socketId);
        
        // Проверяем, что соединение еще активно
        const pcVideo = webrtcService.getPeerConnection(participant.socketId, 'video');
        if (pcVideo && pcVideo.connectionState !== 'closed' && pcVideo.connectionState !== 'failed') {
          // Принудительно пересылаем видео трек
          const localStream = webrtcService.getLocalStream();
          if (localStream) {
            const videoTrack = localStream.getVideoTracks()[0];
            if (videoTrack && videoTrack.enabled) {
              console.log('📹 Форсируем отправку видео трека');
              const sender = pcVideo.getSenders().find(s => s.track?.kind === 'video');
              if (sender && sender.track !== videoTrack) {
                sender.replaceTrack(videoTrack).catch(e => console.error('Ошибка замены видео трека:', e));
              } else if (sender && sender.track === videoTrack) {
                // Трек уже правильный, но создаем новый offer для гарантии
                webrtcService.createOffer(participant.socketId, 'video');
              }
            }
          }
        }
      }, 500);
      
      // Если у нас активен screen share, отправляем screen offer
      // Проверяем напрямую в webrtcService, а не через state (который может запаздывать)
      const hasScreenStream = webrtcService.getLocalScreenStream();
      if (hasScreenStream || isScreenSharing) {
        console.log('📺 Отправляю screen offer новому участнику:', participant.socketId, '(hasScreenStream:', !!hasScreenStream, 'isScreenSharing:', isScreenSharing, ')');
        webrtcService.createOffer(participant.socketId, 'screen');
      }
    });

    socketService.onExistingParticipants(({ participants }) => {
      const mySocketId = socketService.getSocket()?.id;
      console.log('Существующие участники:', participants, 'Мой socketId:', mySocketId);

      // Фильтруем дубли по userId - берем только один socketId на пользователя
      const userIdToParticipant = new Map<string, typeof participants[0]>();
      participants.forEach((p) => {
        if (p.socketId !== mySocketId) {
          // Если уже есть участник с таким userId, оставляем более новый (по socketId)
          const existing = userIdToParticipant.get(p.userId);
          if (!existing || p.socketId > existing.socketId) {
            userIdToParticipant.set(p.userId, p);
          }
        }
      });

      // ВАЖНО: Полностью заменяем список участников, а не дополняем
      setParticipants(() => {
        const newParticipants = new Map();
        
        // Добавляем уникальных участников
        userIdToParticipant.forEach((p) => {
          newParticipants.set(p.socketId, p);
        });
        
        console.log('✅ Список участников полностью заменен, новый размер:', newParticipants.size);
        return newParticipants;
      });

      // Сначала обрабатываем информацию о screen sharing для уникальных участников
      const uniqueParticipants = Array.from(userIdToParticipant.values());
      uniqueParticipants.forEach((existingParticipant: any) => {
        if (existingParticipant.socketId === mySocketId) return;
        const hasScreenFlag = !!existingParticipant.mediaState?.screen;
        const screenStreamId = existingParticipant.screenStreamId as string | undefined;
        if (hasScreenFlag || screenStreamId) {
          console.log('Участник', existingParticipant.socketId, 'уже стримит экран (по данным existing-participants)');
          webrtcService.markPeerExpectsScreen(existingParticipant.socketId);
          if (screenStreamId) {
            webrtcService.setAnnouncedScreenStreamId(existingParticipant.socketId, screenStreamId);
          }
        }
      });

      // Небольшая задержка, чтобы screen-share-started события успели обработаться
      setTimeout(() => {
        uniqueParticipants.forEach((existingParticipant: any) => {
          if (existingParticipant.socketId !== mySocketId && !offersCreated.current.has(existingParticipant.socketId)) {
            console.log('Создаю offer для:', existingParticipant.socketId);
            offersCreated.current.add(existingParticipant.socketId);
            webrtcService.createOffer(existingParticipant.socketId, 'video');
            webrtcService.createOffer(existingParticipant.socketId, 'audio');
            
            // Если у НАС активен screen share, отправляем screen offer
            const hasScreenStream = webrtcService.getLocalScreenStream();
            if (hasScreenStream || isScreenSharing) {
              console.log('📺 Отправляю screen offer существующему участнику (мой screen):', existingParticipant.socketId, '(hasScreenStream:', !!hasScreenStream, ')');
              webrtcService.createOffer(existingParticipant.socketId, 'screen');
            }
          }
        });
      }, 150);
    });

    socketService.onReceiveOffer(async ({ from, offer, connectionType }) => {
      const mySocketId = socketService.getSocket()?.id;
      if (from === mySocketId) {
        return;
      }
      await webrtcService.handleOffer(from, offer, connectionType);
    });

    socketService.onReceiveAnswer(async ({ from, answer, connectionType }) => {
      const mySocketId = socketService.getSocket()?.id;
      if (from === mySocketId) {
        return;
      }
      await webrtcService.handleAnswer(from, answer, connectionType);
    });

    socketService.onReceiveIceCandidate(async ({ from, candidate, connectionType }) => {
      await webrtcService.handleIceCandidate(from, candidate, connectionType);
    });

    socketService.onUserLeft(({ socketId }) => {
      console.log('Участник покинул комнату:', socketId);
      webrtcService.closeConnection(socketId);
      
      // Удаляем из participants
      setParticipants((prev) => {
        const newParticipants = new Map(prev);
        newParticipants.delete(socketId);
        console.log('📊 Участник удален, осталось:', newParticipants.size);
        return newParticipants;
      });
      
      // Удаляем streams (на случай если closeConnection не обновил state)
      setRemoteVideoStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setRemoteAudioStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      setRemoteScreenStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
      
      webrtcService.clearAnnouncedScreenStreamId(socketId);
    });

    socketService.onMediaToggled(({ socketId, mediaType, enabled }) => {
      setParticipants((previous) => {
        const next = new Map(previous);
        const participant = next.get(socketId);
        if (participant) {
          participant.mediaState[mediaType as keyof typeof participant.mediaState] = enabled;
          if (mediaType === 'camera') {
            participant.hasVideo = enabled;
          }
          if (mediaType === 'microphone') {
            participant.hasAudio = enabled;
          }
          next.set(socketId, { ...participant });
        }
        return next;
      });
    });

    // Экран: сигнал о том, что у участника началась/завершилась демонстрация
    socketService.onScreenShareStarted(({ socketId, screenStreamId }) => {
      console.log('screen-share-started от', socketId, 'streamId:', screenStreamId);
      webrtcService.setAnnouncedScreenStreamId(socketId, screenStreamId);
      webrtcService.markPeerExpectsScreen(socketId);
      
      // Обновляем mediaState.screen в participants
      setParticipants((prev) => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          participant.mediaState.screen = true;
          next.set(socketId, { ...participant });
        }
        return next;
      });
      
      // НЕ создаем offer здесь! Ждем входящий offer от того, кто начал screen share
      // Он сам отправит offer через startScreenShare() → createOffer('screen')
    });

    socketService.onScreenShareStopped(({ socketId }) => {
      console.log('screen-share-stopped от', socketId);
      webrtcService.clearAnnouncedScreenStreamId(socketId);
      
      // Обновляем mediaState.screen в participants
      setParticipants((prev) => {
        const next = new Map(prev);
        const participant = next.get(socketId);
        if (participant) {
          participant.mediaState.screen = false;
          next.set(socketId, { ...participant });
        }
        return next;
      });
      
      setRemoteScreenStreams((prev) => {
        const next = new Map(prev);
        next.delete(socketId);
        return next;
      });
    });

    socketService.onRoomNotFound(async ({ roomId }) => {
      console.error('Комната не найдена:', roomId);
      
      // Попробуем создать комнату автоматически
      try {
        console.log('Пытаемся создать комнату автоматически:', roomId);
        const response = await roomService.createRoom({
          isStatic: true,
          customId: roomId,
          name: `Комната ${roomId}`
        });
        console.log('Комната создана успешно:', response);
        
        // Попробуем присоединиться снова
        setTimeout(() => {
          socketService.joinRoom(roomId, {
            userId: userIdToUse,
            username: usernameToUse,
          });
        }, 1000);
      } catch (error) {
        console.error('Ошибка создания комнаты:', error);
        setError(`Комната "${roomId}" не найдена и не может быть создана. ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
    });

    socketService.onRoomError(({ message }) => {
      console.error('Ошибка комнаты:', message);
      setError(`Ошибка подключения к комнате: ${message}`);
    });

    // Обработчик сообщений чата
    const socket = socketService.getSocket();
    if (socket) {
      // Обработчик истории чата
      socket.on('chat-history', (data: {
        messages: Array<{
          id: string;
          senderId: string;
          senderName: string;
          message: string;
          timestamp: number;
          fileUrl?: string;
          fileName?: string;
          fileType?: string;
        }>;
      }) => {
        console.log('📜 Получена история чата:', data.messages.length, 'сообщений');
        const mySocketId = socket.id;
        setMessages(data.messages.map(msg => ({
          ...msg,
          isOwnMessage: msg.senderId === mySocketId,
        })));
      });

      // Обработчик новых сообщений
      socket.on('chat-message', (data: {
        id: string;
        senderId: string;
        senderName: string;
        message: string;
        timestamp: number;
        fileUrl?: string;
        fileName?: string;
        fileType?: string;
      }) => {
        console.log('💬 Получено сообщение чата:', data);
        const mySocketId = socket.id;
        setMessages((prev) => {
          // Проверяем, не дублируется ли сообщение
          const exists = prev.some(msg => msg.id === data.id);
          if (exists) {
            return prev;
          }
          return [
            ...prev,
            {
              ...data,
              isOwnMessage: data.senderId === mySocketId,
            },
          ];
        });
      });
    }
  }, [roomId, user, guestName, handleRemoteVideoStream, handleRemoteStreamRemoved]);

  const toggleCamera = useCallback(async () => {
    const enabled = await webrtcService.toggleCamera();
    setIsCameraEnabled(enabled);
    socketService.toggleMedia(roomId, 'camera', enabled);
    // Обновляем локальный поток после физического переключения
    const currentStream = webrtcService.getLocalStream();
    if (currentStream) {
      setLocalStream(new MediaStream(currentStream.getTracks()));
    } else {
      setLocalStream(new MediaStream());
    }
  }, [roomId]);

  const toggleMicrophone = useCallback(async () => {
    const enabled = await webrtcService.toggleMicrophone();
    setIsMicrophoneEnabled(enabled);
    socketService.toggleMedia(roomId, 'microphone', enabled);
    // Обновляем локальный поток после физического переключения
    const currentStream = webrtcService.getLocalStream();
    if (currentStream) {
      setLocalStream(new MediaStream(currentStream.getTracks()));
    } else {
      setLocalStream(new MediaStream());
    }
  }, [roomId]);

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      webrtcService.stopScreenShare();
      setIsScreenSharing(false);
      setLocalScreenStream(null);
      socketService.toggleMedia(roomId, 'screen', false);
    } else {
      const success = await webrtcService.startScreenShare();
      if (success) {
        setIsScreenSharing(true);
        setLocalScreenStream(webrtcService.getLocalScreenStream());
        socketService.toggleMedia(roomId, 'screen', true);
      }
    }
  }, [isScreenSharing, roomId]);

  const sendMessage = useCallback(async (message: string, file?: File) => {
    const socket = socketService.getSocket();
    if (socket && (message.trim() || file)) {
      const timestamp = Date.now();
      
      let fileData = null;
      if (file) {
        try {
          // Конвертируем файл в base64
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const result = reader.result as string;
              // Убираем префикс data:type;base64,
              const base64Data = result.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          
          fileData = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: base64,
          };
        } catch (error) {
          console.error('Ошибка чтения файла:', error);
          return;
        }
      }
      
      socket.emit('chat-message', {
        roomId,
        message: message.trim(),
        timestamp,
        file: fileData,
      });
      console.log('💬 Отправлено сообщение:', message, file ? `с файлом ${file.name}` : '');
    }
  }, [roomId]);

  const cleanup = useCallback(() => {
    socketService.leaveRoom(roomId);
    socketService.offAllListeners();
    socketService.disconnect();
    webrtcService.cleanup();
    isInitialized.current = false;
    offersCreated.current.clear();
    setMessages([]);
  }, [roomId]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    localScreenStream,
    remoteVideoStreams,
    remoteAudioStreams,
    remoteScreenStreams,
    isCameraEnabled,
    isMicrophoneEnabled,
    isScreenSharing,
    participants,
    error,
    messages,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    initializeMedia,
    cleanup,
    sendMessage,
  };
};

