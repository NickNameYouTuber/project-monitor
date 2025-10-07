export interface RemoteStream {
  participantId: string;
  stream: MediaStream;
  username: string;
  mediaState: {
    camera: boolean;
    microphone: boolean;
    screen: boolean;
  };
}

export interface WebRTCMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  from: string;
  to: string;
  data: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

