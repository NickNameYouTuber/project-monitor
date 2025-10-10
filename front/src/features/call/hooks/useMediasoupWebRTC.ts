/**
 * MediaSoup WebRTC Hook
 * Полная интеграция с MediaSoupService + auto-recovery tracks
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Socket } from 'socket.io-client';
import { MediaSoupService } from '../services/mediasoupClient';
import type { Consumer } from 'mediasoup-client/lib/types';

export interface Participant {
  socketId: string;
  userId: string;
  username: string;
  mediaState: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
  };
}

export function useMediasoupWebRTC(
  socket: Socket | null,
  roomId: string,
  username: string,
  userId: string
) {
  const navigate = useNavigate();
  
  // Media states
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteVideoStreams, setRemoteVideoStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteAudioStreams, setRemoteAudioStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  
  // Media controls
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  
  // Participants
  const [participants, setParticipants] = useState<Map<string, Participant>>(new Map());
  
  // Chat
  const [messages, setMessages] = useState<any[]>([]);
  
  // Raised hands
  const [raisedHands, setRaisedHands] = useState<Set<string>>(new Set());
  
  // Speaking state
  const [speakingParticipants, setSpeakingParticipants] = useState<Set<string>>(new Set());
  
  // Error
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  const mediasoupService = useRef<MediaSoupService | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const isRecoveringRef = useRef<boolean>(false);

  /**
   * Инициализация медиа устройств
   */
  const initializeMedia = useCallback(async () => {
    if (!socket) {
      console.error('Socket not initialized');
      return;
    }

    try {
      console.log('🎥 Инициализация медиа устройств...');

      // Получить локальный стрим
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      localStreamRef.current = stream;
      setLocalStream(stream);

      // Инициализация MediaSoup Service
      mediasoupService.current = new MediaSoupService({
        socket,
        roomId
      });

      await mediasoupService.current.init();

      // Setup callbacks
      mediasoupService.current.setCallbacks({
        onNewProducer: (peerId, producerId, kind) => {
          console.log(`📢 New producer from ${peerId}: ${kind}`);
        },
        onPeerLeft: (peerId) => {
          console.log(`👋 Peer left: ${peerId}`);
          
          // Удалить streams участника
          setRemoteVideoStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
          });
          
          setRemoteAudioStreams(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
          });
          
          // Удалить участника
          setParticipants(prev => {
            const newMap = new Map(prev);
            newMap.delete(peerId);
            return newMap;
          });
        },
        onProducerClosed: (peerId, producerId) => {
          console.log(`🗑️ Producer closed: ${producerId} from ${peerId}`);
        },
        onConsumerCreated: (consumer: Consumer, peerId: string) => {
          console.log(`✅ Consumer created: ${consumer.kind} from ${peerId}`);
          
          // Создать MediaStream из track
          const stream = new MediaStream([consumer.track]);
          
          if (consumer.kind === 'video') {
            setRemoteVideoStreams(prev => {
              const newMap = new Map(prev);
              newMap.set(peerId, stream);
              return newMap;
            });
          } else if (consumer.kind === 'audio') {
            setRemoteAudioStreams(prev => {
              const newMap = new Map(prev);
              newMap.set(peerId, stream);
              return newMap;
            });
          }
        }
      });

      // Присоединиться к комнате
      await mediasoupService.current.joinRoom();

      // Отправить локальные треки
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        await mediasoupService.current.produce(videoTrack, 'video');
      }

      if (audioTrack) {
        await mediasoupService.current.produce(audioTrack, 'audio');
      }

      console.log('✅ MediaSoup инициализирован и треки отправлены');
    } catch (err: any) {
      console.error('❌ Ошибка инициализации медиа:', err);
      setError(err.message || 'Failed to initialize media');
    }
  }, [socket, roomId]);

  /**
   * Toggle камера
   */
  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current || !mediasoupService.current) return;
    
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    
    if (videoTrack) {
      if (isCameraEnabled) {
        // Выключить камеру
        videoTrack.enabled = false;
        setIsCameraEnabled(false);
        
        // Закрыть producer
        await mediasoupService.current.closeProducer('video');
      } else {
        // Включить камеру
        try {
          // Если трек завершен, создать новый
          if (videoTrack.readyState === 'ended') {
            console.log('🔄 Video track ended, creating new stream...');
            const newStream = await navigator.mediaDevices.getUserMedia({
              video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
              }
            });
            
            const newVideoTrack = newStream.getVideoTracks()[0];
            
            // Заменить трек в localStream
            localStreamRef.current.removeTrack(videoTrack);
            localStreamRef.current.addTrack(newVideoTrack);
            
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            
            // Создать новый producer
            await mediasoupService.current.produce(newVideoTrack, 'video');
          } else {
            videoTrack.enabled = true;
            
            // Создать producer если его нет
            const existingProducer = mediasoupService.current.getProducer('video');
            if (!existingProducer) {
              await mediasoupService.current.produce(videoTrack, 'video');
            }
          }
          
          setIsCameraEnabled(true);
        } catch (err) {
          console.error('Failed to enable camera:', err);
        }
      }
    }
  }, [isCameraEnabled]);

  /**
   * Toggle микрофон
   */
  const toggleMicrophone = useCallback(async () => {
    if (!localStreamRef.current || !mediasoupService.current) return;
    
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    
    if (audioTrack) {
      if (isMicEnabled) {
        // Выключить микрофон
        audioTrack.enabled = false;
        setIsMicEnabled(false);
        
        // Закрыть producer
        await mediasoupService.current.closeProducer('audio');
      } else {
        // Включить микрофон
        try {
          // Если трек завершен, создать новый
          if (audioTrack.readyState === 'ended') {
            console.log('🔄 Audio track ended, creating new stream...');
            const newStream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
              }
            });
            
            const newAudioTrack = newStream.getAudioTracks()[0];
            
            // Заменить трек в localStream
            localStreamRef.current.removeTrack(audioTrack);
            localStreamRef.current.addTrack(newAudioTrack);
            
            setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
            
            // Создать новый producer
            await mediasoupService.current.produce(newAudioTrack, 'audio');
          } else {
            audioTrack.enabled = true;
            
            // Создать producer если его нет
            const existingProducer = mediasoupService.current.getProducer('audio');
            if (!existingProducer) {
              await mediasoupService.current.produce(audioTrack, 'audio');
            }
          }
          
          setIsMicEnabled(true);
        } catch (err) {
          console.error('Failed to enable microphone:', err);
        }
      }
    }
  }, [isMicEnabled]);

  /**
   * Toggle screen share
   */
  const toggleScreenShare = useCallback(async () => {
    if (!mediasoupService.current) return;
    
    if (isScreenSharing) {
      // Остановить screen share
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;
      }
      
      await mediasoupService.current.closeProducer('video'); // screen использует video kind
      setIsScreenSharing(false);
    } else {
      // Начать screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        
        screenStreamRef.current = screenStream;
        
        const screenTrack = screenStream.getVideoTracks()[0];
        
        // Produce screen track
        await mediasoupService.current.produce(screenTrack, 'video');
        
        setIsScreenSharing(true);
        
        // Автоматически остановить при завершении трека
        screenTrack.onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
        };
      } catch (err) {
        console.error('Failed to start screen share:', err);
      }
    }
  }, [isScreenSharing]);

  /**
   * Toggle raise hand
   */
  const toggleRaiseHand = useCallback(() => {
    if (!socket) return;
    
    socket.emit('toggle-raise-hand');
  }, [socket]);

  /**
   * Send message
   */
  const sendMessage = useCallback((message: string) => {
    if (!socket) return;
    
    socket.emit('send-message', { roomId, message });
  }, [socket, roomId]);

  /**
   * Leave room
   */
  const leaveRoom = useCallback(() => {
    console.log('🚪 Leaving room...');
    
    // Остановить локальные треки
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // Очистить MediaSoup
    if (mediasoupService.current) {
      mediasoupService.current.destroy();
      mediasoupService.current = null;
    }
    
    navigate('/');
  }, [navigate]);

  /**
   * Cleanup
   */
  const cleanup = useCallback(() => {
    leaveRoom();
  }, [leaveRoom]);

  /**
   * AUTO-RECOVERY: Track onended handler
   */
  useEffect(() => {
    if (!localStreamRef.current || isRecoveringRef.current) return;
    
    const handleTrackEnded = async (track: MediaStreamTrack) => {
      if (isRecoveringRef.current) return;
      
      console.warn(`⚠️ Track ended: ${track.kind}, attempting recovery...`);
      isRecoveringRef.current = true;
      
      try {
        if (track.kind === 'video' && isCameraEnabled) {
          // Пересоздать camera track
          await toggleCamera(); // off
          setTimeout(async () => {
            await toggleCamera(); // on
            isRecoveringRef.current = false;
          }, 1000);
        } else if (track.kind === 'audio' && isMicEnabled) {
          // Пересоздать audio track
          await toggleMicrophone(); // off
          setTimeout(async () => {
            await toggleMicrophone(); // on
            isRecoveringRef.current = false;
          }, 1000);
        } else {
          isRecoveringRef.current = false;
        }
      } catch (error) {
        console.error('Track recovery failed:', error);
        isRecoveringRef.current = false;
      }
    };
    
    const tracks = localStreamRef.current.getTracks();
    const listeners: Array<{ track: MediaStreamTrack, handler: () => void }> = [];
    
    tracks.forEach(track => {
      const handler = () => handleTrackEnded(track);
      track.addEventListener('ended', handler);
      listeners.push({ track, handler });
    });
    
    return () => {
      listeners.forEach(({ track, handler }) => {
        track.removeEventListener('ended', handler);
      });
    };
  }, [localStream, isCameraEnabled, isMicEnabled, toggleCamera, toggleMicrophone]);

  /**
   * HEARTBEAT: Проверка tracks каждые 5 секунд
   */
  useEffect(() => {
    const interval = setInterval(() => {
      // Проверка локальных треков
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'ended') {
            console.error(`💀 Dead track detected: ${track.kind}`);
            
            // Trigger recovery
            if (track.kind === 'video' && isCameraEnabled && !isRecoveringRef.current) {
              console.log('🔄 Attempting video track recovery...');
              setIsCameraEnabled(false);
              setTimeout(() => setIsCameraEnabled(true), 1000);
            } else if (track.kind === 'audio' && isMicEnabled && !isRecoveringRef.current) {
              console.log('🔄 Attempting audio track recovery...');
              setIsMicEnabled(false);
              setTimeout(() => setIsMicEnabled(true), 1000);
            }
          }
        });
      }
      
      // Проверка remote streams
      remoteVideoStreams.forEach((stream, socketId) => {
        if (stream.getTracks().every(t => t.readyState === 'ended')) {
          console.warn(`💀 All tracks dead for ${socketId}, requesting re-consume`);
          
          // Запросить пересоздание consumer на сервере
          if (socket) {
            socket.emit('request-consumer-restart', { socketId });
          }
        }
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [localStream, remoteVideoStreams, isCameraEnabled, isMicEnabled, socket]);

  /**
   * Socket event listeners
   */
  useEffect(() => {
    if (!socket) return;

    // Chat messages
    socket.on('receive-message', (data: any) => {
      setMessages(prev => [...prev, data]);
    });

    // Raised hands
    socket.on('hand-raised', ({ socketId }: { socketId: string }) => {
      setRaisedHands(prev => new Set(prev).add(socketId));
    });

    socket.on('hand-lowered', ({ socketId }: { socketId: string }) => {
      setRaisedHands(prev => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    });

    // Speaking state
    socket.on('user-speaking', ({ socketId }: { socketId: string }) => {
      setSpeakingParticipants(prev => new Set(prev).add(socketId));
    });

    socket.on('user-stopped-speaking', ({ socketId }: { socketId: string }) => {
      setSpeakingParticipants(prev => {
        const newSet = new Set(prev);
        newSet.delete(socketId);
        return newSet;
      });
    });

    return () => {
      socket.off('receive-message');
      socket.off('hand-raised');
      socket.off('hand-lowered');
      socket.off('user-speaking');
      socket.off('user-stopped-speaking');
    };
  }, [socket]);

  return {
    localStream,
    localScreenStream: screenStreamRef.current,
    remoteVideoStreams,
    remoteAudioStreams,
    remoteScreenStreams,
    isCameraEnabled,
    isMicrophoneEnabled: isMicEnabled,
    isScreenSharing,
    toggleCamera,
    toggleMicrophone,
    toggleScreenShare,
    participants,
    messages,
    sendMessage,
    raisedHands,
    isHandRaised: socket && socket.id ? raisedHands.has(socket.id) : false,
    toggleRaiseHand,
    speakingParticipants,
    error,
    initializeMedia,
    cleanup,
    leaveRoom
  };
}
