module.exports = {
  // ICE servers configuration
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'turn:turn.nicorp.tech:3478',
      username: 'nimeet',
      credential: 'nimeet123'
    }
  ],
  
  // Simulcast encodings for video producers
  simulcastEncodings: [
    { 
      rid: 'r0',
      maxBitrate: 100000, 
      scaleResolutionDownBy: 4,
      scalabilityMode: 'S1T3'  // Low quality (180p)
    },
    { 
      rid: 'r1',
      maxBitrate: 300000, 
      scaleResolutionDownBy: 2,
      scalabilityMode: 'S1T3'  // Medium quality (360p)
    },
    { 
      rid: 'r2',
      maxBitrate: 900000, 
      scaleResolutionDownBy: 1,
      scalabilityMode: 'S1T3'  // High quality (720p)
    }
  ],
  
  // Producer options
  producerOptions: {
    codecOptions: {
      videoGoogleStartBitrate: 1000
    }
  },
  
  // Consumer options with adaptive layers
  consumerOptions: {
    // Start with medium quality by default
    preferredLayers: { spatialLayer: 1, temporalLayer: 2 }
  },
  
  // Quality presets
  qualityPresets: {
    low: { spatialLayer: 0, temporalLayer: 2 },     // 180p
    medium: { spatialLayer: 1, temporalLayer: 2 },  // 360p
    high: { spatialLayer: 2, temporalLayer: 2 }     // 720p
  }
};

