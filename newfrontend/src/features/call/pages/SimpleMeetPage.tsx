import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';

// Используем тот же backend, но подключаемся к namespace /simple-meet
const isProduction = process.env.NODE_ENV === 'production';
const isTauriApp = typeof window !== 'undefined' &&
  ((window as any).__TAURI__ ||
   (window as any).__TAURI_INTERNALS__ ||
   window.location.hostname === 'tauri.localhost' ||
   window.location.protocol === 'tauri:');

const isWebBrowser = typeof window !== 'undefined' && !isTauriApp;
const isDevelopment = process.env.NODE_ENV !== 'production';

const BACKEND_URL = (isTauriApp || !isWebBrowser || !isDevelopment)
  ? 'https://meet.nicorp.tech'
  : 'http://localhost:7676';

interface PeerData {
  videoPc?: RTCPeerConnection;
  audioPc?: RTCPeerConnection;
  screenPc?: RTCPeerConnection;
  audioMonitor?: () => void;
}

const SimpleMeetPage: React.FC = () => {
  const { callId } = useParams<{ callId: string }>();
  const [roomId, setRoomId] = useState<string>(callId || '');
  const [joined, setJoined] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenEnabled, setScreenEnabled] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const localVideoStreamRef = useRef<MediaStream | null>(null);
  const localAudioStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localAudioMonitorRef = useRef<(() => void) | null>(null);
  const peersRef = useRef<Map<string, PeerData>>(new Map());
  const videosContainerRef = useRef<HTMLDivElement>(null);
  const localTileRef = useRef<HTMLDivElement | null>(null);

  const configuration: RTCConfiguration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
  };

  // Функции для получения потоков
  const getVideoStream = async (): Promise<MediaStream | null> => {
    try {
      console.log('Requesting video media');
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      console.log('Got local video stream', stream);
      return stream;
    } catch (err) {
      console.error('Error getting video media', err);
      return null;
    }
  };

  const getAudioStream = async (): Promise<MediaStream | null> => {
    try {
      console.log('Requesting audio media');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Got local audio stream', stream);
      return stream;
    } catch (err) {
      console.error('Error getting audio media', err);
      return null;
    }
  };

  const getScreenStream = async (): Promise<MediaStream | null> => {
    try {
      console.log('Requesting screen media');
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      console.log('Got local screen stream', stream);
      return stream;
    } catch (err) {
      console.error('Error getting screen media', err);
      return null;
    }
  };

  const stopVideoStream = () => {
    if (localVideoStreamRef.current) {
      console.log('Stopping local video stream tracks');
      localVideoStreamRef.current.getTracks().forEach(track => track.stop());
      localVideoStreamRef.current = null;
    }
  };

  const stopAudioStream = () => {
    if (localAudioStreamRef.current) {
      console.log('Stopping local audio stream tracks');
      localAudioStreamRef.current.getTracks().forEach(track => track.stop());
      localAudioStreamRef.current = null;
    }
  };

  const stopScreenStream = () => {
    if (localScreenStreamRef.current) {
      console.log('Stopping local screen stream tracks');
      localScreenStreamRef.current.getTracks().forEach(track => track.stop());
      localScreenStreamRef.current = null;
    }
  };

  // Создание тайла
  const createTile = (id: string, label: string): HTMLDivElement => {
    console.log('Creating tile for', id);
    const tile = document.createElement('div');
    tile.id = `tile-${id}`;
    tile.className = 'tile';
    tile.style.cssText = 'width: 610px; height: 225px; margin: 10px; border: 1px solid #ccc; display: flex; flex-direction: row; background: #000; position: relative;';
    
    const contentCamera = document.createElement('div');
    contentCamera.className = 'content-camera';
    contentCamera.style.cssText = 'width: 300px; height: 225px; display: flex; align-items: center; justify-content: center; background: #000;';
    
    const contentScreen = document.createElement('div');
    contentScreen.className = 'content-screen';
    contentScreen.style.cssText = 'width: 300px; height: 225px; display: flex; align-items: center; justify-content: center; background: #000; border-left: 1px solid #ccc;';
    
    tile.appendChild(contentCamera);
    tile.appendChild(contentScreen);
    
    updateCameraContent(id, false, label);
    updateScreenContent(id, false);
    return tile;
  };

  const updateCameraContent = (id: string, hasMedia: boolean, label: string) => {
    const tile = document.getElementById(`tile-${id}`);
    if (!tile) return;
    const content = tile.querySelector('.content-camera');
    if (!content) return;
    content.innerHTML = '';
    if (!hasMedia) {
      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.style.cssText = 'color: white; font-size: 20px;';
      ph.textContent = label || 'User';
      content.appendChild(ph);
    }
  };

  const updateScreenContent = (id: string, hasMedia: boolean) => {
    const tile = document.getElementById(`tile-${id}`);
    if (!tile) return;
    const content = tile.querySelector('.content-screen');
    if (!content) return;
    content.innerHTML = '';
    if (!hasMedia) {
      const ph = document.createElement('div');
      ph.className = 'placeholder';
      ph.style.cssText = 'color: white; font-size: 20px;';
      ph.textContent = 'No Demo';
      content.appendChild(ph);
    }
  };

  const ensureTile = (peerId: string) => {
    const tile = document.getElementById(`tile-${peerId}`);
    if (!tile && videosContainerRef.current) {
      console.log('Ensuring tile for', peerId);
      const remoteTile = createTile(peerId, 'User');
      videosContainerRef.current.appendChild(remoteTile);
    }
  };

  const updateLocalTile = () => {
    if (!localTileRef.current && videosContainerRef.current) {
      localTileRef.current = createTile('local', 'Me');
      videosContainerRef.current.appendChild(localTileRef.current);
    }
    updateCameraContent('local', !!localVideoStreamRef.current, 'Me');
    updateScreenContent('local', !!localScreenStreamRef.current);
    
    const tile = localTileRef.current;
    if (!tile) return;
    
    const contentCamera = tile.querySelector('.content-camera');
    if (localVideoStreamRef.current && contentCamera) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = localVideoStreamRef.current;
      video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      contentCamera.appendChild(video);
    }
    
    const contentScreen = tile.querySelector('.content-screen');
    if (localScreenStreamRef.current && contentScreen) {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = localScreenStreamRef.current;
      video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
      contentScreen.appendChild(video);
    }
  };

  const monitorAudio = (stream: MediaStream, tileId: string): (() => void) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const checkLevel = () => {
      analyser.getByteFrequencyData(dataArray);
      const sum = dataArray.reduce((a, b) => a + b, 0);
      const avg = sum / dataArray.length;
      const threshold = 10;
      const tile = document.getElementById(tileId);
      if (tile) {
        if (avg > threshold) {
          tile.classList.add('speaking');
          tile.style.border = '3px solid green';
        } else {
          tile.classList.remove('speaking');
          tile.style.border = '1px solid #ccc';
        }
      }
      requestAnimationFrame(checkLevel);
    };
    checkLevel();
    return () => {
      console.log('Tearing down audio monitor for', tileId);
      audioContext.close();
    };
  };

  const setupLocalAudioMonitor = () => {
    if (localAudioStreamRef.current) {
      console.log('Setting up local audio monitor');
      localAudioMonitorRef.current = monitorAudio(localAudioStreamRef.current, 'tile-local');
    }
  };

  const initPeer = (peerId: string) => {
    if (!peersRef.current.has(peerId)) {
      peersRef.current.set(peerId, {});
    }
  };

  const createPeerConnection = (peerId: string, type: 'video' | 'audio' | 'screen'): RTCPeerConnection => {
    console.log(`Creating ${type} peer connection for`, peerId);
    const pc = new RTCPeerConnection(configuration);
    
    pc.addEventListener('icecandidate', event => {
      if (event.candidate && socketRef.current) {
        console.log(`Sending ${type} ICE candidate to`, peerId);
        socketRef.current.emit('ice-candidate', { candidate: event.candidate, to: peerId, room: roomId, type });
      }
    });
    
    pc.addEventListener('track', event => {
      console.log(`Received remote ${type} track from`, peerId);
      const tile = document.getElementById(`tile-${peerId}`);
      if (!tile) return;
      
      if (type === 'audio') {
        const audio = document.createElement('audio');
        audio.id = `remote-audio-${peerId}`;
        audio.autoplay = true;
        audio.srcObject = new MediaStream([event.track]);
        document.body.appendChild(audio);
        
        const peerData = peersRef.current.get(peerId);
        if (peerData?.audioMonitor) peerData.audioMonitor();
        const monitor = monitorAudio(audio.srcObject, `tile-${peerId}`);
        if (peerData) peerData.audioMonitor = monitor;
        return;
      }
      
      let content: Element | null = null;
      if (type === 'video') {
        content = tile.querySelector('.content-camera');
        if (content) content.innerHTML = '';
      } else if (type === 'screen') {
        content = tile.querySelector('.content-screen');
        if (content) content.innerHTML = '';
      }
      
      if (content) {
        const video = document.createElement('video');
        video.id = `remote-${type}-${peerId}`;
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = new MediaStream([event.track]);
        video.style.cssText = 'width: 100%; height: 100%; object-fit: cover;';
        content.appendChild(video);
      }
    });
    
    return pc;
  };

  const createVideoOffer = async (peerId: string) => {
    initPeer(peerId);
    const pc = createPeerConnection(peerId, 'video');
    const peerData = peersRef.current.get(peerId)!;
    peerData.videoPc = pc;
    
    if (localVideoStreamRef.current) {
      console.log('Adding local video tracks to offer for', peerId);
      localVideoStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localVideoStreamRef.current!));
    }
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending video offer to', peerId);
    socketRef.current?.emit('offer', { offer, to: peerId, room: roomId, type: 'video' });
  };

  const createAudioOffer = async (peerId: string) => {
    initPeer(peerId);
    const pc = createPeerConnection(peerId, 'audio');
    const peerData = peersRef.current.get(peerId)!;
    peerData.audioPc = pc;
    
    if (localAudioStreamRef.current) {
      console.log('Adding local audio tracks to offer for', peerId);
      localAudioStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localAudioStreamRef.current!));
    }
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending audio offer to', peerId);
    socketRef.current?.emit('offer', { offer, to: peerId, room: roomId, type: 'audio' });
  };

  const createScreenOffer = async (peerId: string) => {
    initPeer(peerId);
    const pc = createPeerConnection(peerId, 'screen');
    const peerData = peersRef.current.get(peerId)!;
    peerData.screenPc = pc;
    
    if (localScreenStreamRef.current) {
      console.log('Adding local screen tracks to offer for', peerId);
      localScreenStreamRef.current.getTracks().forEach(track => pc.addTrack(track, localScreenStreamRef.current!));
    }
    
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    console.log('Sending screen offer to', peerId);
    socketRef.current?.emit('offer', { offer, to: peerId, room: roomId, type: 'screen' });
  };

  const toggleVideo = async () => {
    const newState = !videoEnabled;
    console.log('Toggling video to', newState);
    
    if (newState) {
      const stream = await getVideoStream();
      if (stream) {
        localVideoStreamRef.current = stream;
        setVideoEnabled(true);
        updateLocalTile();
        peersRef.current.forEach((_, peerId) => createVideoOffer(peerId));
      } else {
        console.log('Failed to enable video, reverting state');
      }
    } else {
      setVideoEnabled(false);
      stopVideoStream();
      updateLocalTile();
      peersRef.current.forEach((peerData) => {
        if (peerData.videoPc) {
          peerData.videoPc.close();
          delete peerData.videoPc;
        }
      });
      socketRef.current?.emit('close-media', { type: 'video', room: roomId });
    }
  };

  const toggleAudio = async () => {
    const newState = !audioEnabled;
    console.log('Toggling audio to', newState);
    
    if (newState) {
      const stream = await getAudioStream();
      if (stream) {
        localAudioStreamRef.current = stream;
        setAudioEnabled(true);
        setupLocalAudioMonitor();
        peersRef.current.forEach((_, peerId) => createAudioOffer(peerId));
      } else {
        console.log('Failed to enable audio, reverting state');
      }
    } else {
      setAudioEnabled(false);
      stopAudioStream();
      if (localAudioMonitorRef.current) {
        localAudioMonitorRef.current();
        localAudioMonitorRef.current = null;
      }
      peersRef.current.forEach((peerData) => {
        if (peerData.audioPc) {
          peerData.audioPc.close();
          delete peerData.audioPc;
        }
        if (peerData.audioMonitor) {
          peerData.audioMonitor();
          delete peerData.audioMonitor;
        }
      });
      socketRef.current?.emit('close-media', { type: 'audio', room: roomId });
    }
  };

  const toggleScreen = async () => {
    const newState = !screenEnabled;
    console.log('Toggling screen to', newState);
    
    if (newState) {
      const stream = await getScreenStream();
      if (stream) {
        localScreenStreamRef.current = stream;
        setScreenEnabled(true);
        updateLocalTile();
        peersRef.current.forEach((_, peerId) => createScreenOffer(peerId));
      } else {
        console.log('Failed to enable screen, reverting state');
      }
    } else {
      setScreenEnabled(false);
      stopScreenStream();
      updateLocalTile();
      peersRef.current.forEach((peerData) => {
        if (peerData.screenPc) {
          peerData.screenPc.close();
          delete peerData.screenPc;
        }
      });
      socketRef.current?.emit('close-media', { type: 'screen', room: roomId });
    }
  };

  const handleJoinRoom = async () => {
    if (!roomId.trim()) {
      alert('Enter room ID');
      return;
    }
    
    console.log('Joining room', roomId);
    
    if (videoEnabled) {
      const stream = await getVideoStream();
      if (stream) {
        localVideoStreamRef.current = stream;
      } else {
        setVideoEnabled(false);
        console.log('Failed to get video stream on join, disabling video');
      }
    }
    
    if (audioEnabled) {
      const stream = await getAudioStream();
      if (stream) {
        localAudioStreamRef.current = stream;
      } else {
        setAudioEnabled(false);
        console.log('Failed to get audio stream on join, disabling audio');
      }
    }
    
    updateLocalTile();
    setupLocalAudioMonitor();
    socketRef.current?.emit('join-room', roomId);
    setJoined(true);
  };

  // Socket.io setup
  useEffect(() => {
    console.log('Connecting to backend simple-meet namespace:', BACKEND_URL + '/simple-meet');
    const socket = io(BACKEND_URL + '/simple-meet', {
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      if (joined && roomId) {
        console.log('Rejoining room on reconnect', roomId);
        socket.emit('join-room', roomId);
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('user-joined', async (peerId: string) => {
      console.log('User joined', peerId);
      initPeer(peerId);
      ensureTile(peerId);
      if (videoEnabled) await createVideoOffer(peerId);
      if (audioEnabled) await createAudioOffer(peerId);
      if (screenEnabled) await createScreenOffer(peerId);
    });

    socket.on('offer', async ({ offer, from, type }: { offer: RTCSessionDescriptionInit; from: string; type: 'video' | 'audio' | 'screen' }) => {
      console.log(`Received ${type} offer from`, from);
      initPeer(from);
      ensureTile(from);
      
      let pc: RTCPeerConnection;
      let localStream: MediaStream | null = null;
      const peerData = peersRef.current.get(from)!;
      
      if (type === 'video') {
        pc = createPeerConnection(from, 'video');
        peerData.videoPc = pc;
        localStream = localVideoStreamRef.current;
      } else if (type === 'audio') {
        pc = createPeerConnection(from, 'audio');
        peerData.audioPc = pc;
        localStream = localAudioStreamRef.current;
      } else {
        pc = createPeerConnection(from, 'screen');
        peerData.screenPc = pc;
        localStream = localScreenStreamRef.current;
      }
      
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      if (localStream) {
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream!));
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      console.log(`Sending ${type} answer to`, from);
      socket.emit('answer', { answer, to: from, room: roomId, type });
    });

    socket.on('answer', async ({ answer, from, type }: { answer: RTCSessionDescriptionInit; from: string; type: 'video' | 'audio' | 'screen' }) => {
      console.log(`Received ${type} answer from`, from);
      const peerData = peersRef.current.get(from);
      if (!peerData) return;
      
      let pc: RTCPeerConnection | undefined;
      if (type === 'video') pc = peerData.videoPc;
      else if (type === 'audio') pc = peerData.audioPc;
      else if (type === 'screen') pc = peerData.screenPc;
      
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate, from, type }: { candidate: RTCIceCandidateInit; from: string; type: 'video' | 'audio' | 'screen' }) => {
      console.log(`Received ${type} ICE candidate from`, from);
      const peerData = peersRef.current.get(from);
      if (!peerData) return;
      
      let pc: RTCPeerConnection | undefined;
      if (type === 'video') pc = peerData.videoPc;
      else if (type === 'audio') pc = peerData.audioPc;
      else if (type === 'screen') pc = peerData.screenPc;
      
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    socket.on('close-media', ({ type, from }: { type: 'video' | 'audio' | 'screen'; from: string }) => {
      console.log(`Received close ${type} from`, from);
      const peerData = peersRef.current.get(from);
      if (!peerData) return;
      
      if (type === 'video') {
        if (peerData.videoPc) {
          peerData.videoPc.close();
          delete peerData.videoPc;
        }
        const remoteVideo = document.getElementById(`remote-video-${from}`);
        if (remoteVideo) remoteVideo.remove();
        updateCameraContent(from, false, 'User');
      } else if (type === 'audio') {
        if (peerData.audioPc) {
          peerData.audioPc.close();
          delete peerData.audioPc;
        }
        if (peerData.audioMonitor) {
          peerData.audioMonitor();
          delete peerData.audioMonitor;
        }
        const remoteAudio = document.getElementById(`remote-audio-${from}`);
        if (remoteAudio) remoteAudio.remove();
      } else if (type === 'screen') {
        if (peerData.screenPc) {
          peerData.screenPc.close();
          delete peerData.screenPc;
        }
        const remoteScreen = document.getElementById(`remote-screen-${from}`);
        if (remoteScreen) remoteScreen.remove();
        updateScreenContent(from, false);
      }
    });

    socket.on('user-left', (peerId: string) => {
      console.log('User left', peerId);
      const peerData = peersRef.current.get(peerId);
      if (peerData) {
        if (peerData.videoPc) peerData.videoPc.close();
        if (peerData.audioPc) peerData.audioPc.close();
        if (peerData.screenPc) peerData.screenPc.close();
        if (peerData.audioMonitor) peerData.audioMonitor();
        
        const remoteVideo = document.getElementById(`remote-video-${peerId}`);
        const remoteAudio = document.getElementById(`remote-audio-${peerId}`);
        const remoteScreen = document.getElementById(`remote-screen-${peerId}`);
        if (remoteVideo) remoteVideo.remove();
        if (remoteAudio) remoteAudio.remove();
        if (remoteScreen) remoteScreen.remove();
        
        peersRef.current.delete(peerId);
      }
      const tile = document.getElementById(`tile-${peerId}`);
      if (tile) tile.remove();
    });

    return () => {
      socket.disconnect();
    };
  }, [joined, roomId, videoEnabled, audioEnabled, screenEnabled]);

  // Auto-join if callId is provided
  useEffect(() => {
    if (callId && !joined) {
      setRoomId(callId);
      setTimeout(() => handleJoinRoom(), 100);
    }
  }, [callId]);

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: 0, padding: '20px', background: '#f0f0f0' }}>
      {!joined && (
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter Room ID"
            style={{ padding: '5px', marginRight: '10px' }}
          />
          <button onClick={handleJoinRoom} style={{ padding: '5px 10px', marginRight: '5px' }}>
            Join Room
          </button>
        </div>
      )}
      
      <div ref={videosContainerRef} style={{ display: 'flex', flexWrap: 'wrap' }}></div>
      
      {joined && (
        <div style={{ marginTop: '10px' }}>
          <button onClick={toggleVideo} style={{ padding: '5px 10px', marginRight: '5px' }}>
            {videoEnabled ? 'Disable Video' : 'Enable Video'}
          </button>
          <button onClick={toggleAudio} style={{ padding: '5px 10px', marginRight: '5px' }}>
            {audioEnabled ? 'Disable Audio' : 'Enable Audio'}
          </button>
          <button onClick={toggleScreen} style={{ padding: '5px 10px', marginRight: '5px' }}>
            {screenEnabled ? 'Disable Screen' : 'Enable Screen'}
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleMeetPage;
