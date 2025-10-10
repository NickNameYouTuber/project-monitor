/**
 * Active Speaker Detector
 * Определяет активного говорящего и приоритизирует его видео
 */

import type { Consumer } from 'mediasoup-client/lib/types';
import { MediaSoupService } from './mediasoupClient';

export interface SpeakerInfo {
  peerId: string;
  consumerId: string;
  audioLevel: number;
  timestamp: number;
}

export class ActiveSpeakerDetector {
  private mediasoupService: MediaSoupService | null = null;
  private audioContexts: Map<string, AudioContext> = new Map();
  private analyzers: Map<string, AnalyserNode> = new Map();
  private audioLevels: Map<string, number[]> = new Map(); // peerId -> recent audio levels
  
  private activeSpeaker: string | null = null;
  private speakerHistory: SpeakerInfo[] = [];
  private maxHistoryLength = 20;
  
  // Thresholds
  private readonly audioThreshold = 0.01; // Minimum audio level to consider as speaking
  private readonly dominanceDuration = 2000; // ms - how long someone needs to speak to become active
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onActiveSpeakerChange?: (peerId: string | null) => void;

  constructor() {
    console.log('🎤 ActiveSpeakerDetector initialized');
  }

  /**
   * Установить MediaSoup service
   */
  setMediaSoupService(service: MediaSoupService) {
    this.mediasoupService = service;
  }

  /**
   * Установить callback для изменения активного спикера
   */
  setOnActiveSpeakerChange(callback: (peerId: string | null) => void) {
    this.onActiveSpeakerChange = callback;
  }

  /**
   * Добавить audio consumer для мониторинга
   */
  addAudioConsumer(peerId: string, consumer: Consumer, stream: MediaStream) {
    if (consumer.kind !== 'audio') {
      console.warn('Only audio consumers should be added to ActiveSpeakerDetector');
      return;
    }

    // Create AudioContext and AnalyserNode
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.1;
    
    source.connect(analyser);
    
    this.audioContexts.set(peerId, audioContext);
    this.analyzers.set(peerId, analyser);
    this.audioLevels.set(peerId, []);
    
    console.log(`🎤 Audio consumer added for monitoring: ${peerId}`);
  }

  /**
   * Удалить audio consumer
   */
  removeAudioConsumer(peerId: string) {
    const audioContext = this.audioContexts.get(peerId);
    if (audioContext) {
      audioContext.close();
      this.audioContexts.delete(peerId);
    }
    
    this.analyzers.delete(peerId);
    this.audioLevels.delete(peerId);
    
    // If this was the active speaker, clear it
    if (this.activeSpeaker === peerId) {
      this.setActiveSpeaker(null);
    }
    
    console.log(`🎤 Audio consumer removed: ${peerId}`);
  }

  /**
   * Начать мониторинг активного спикера
   */
  startMonitoring(intervalMs: number = 100) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`🎤 Starting active speaker monitoring (interval: ${intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(() => {
      this.detectActiveSpeaker();
    }, intervalMs);
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️  Active speaker monitoring stopped');
    }
  }

  /**
   * Определить активного спикера
   */
  private detectActiveSpeaker() {
    const now = Date.now();
    const currentLevels: { peerId: string; level: number }[] = [];

    // Получить audio level для каждого участника
    this.analyzers.forEach((analyser, peerId) => {
      const level = this.getAudioLevel(analyser);
      
      // Сохранить в историю
      const levels = this.audioLevels.get(peerId) || [];
      levels.push(level);
      
      // Keep only last 10 measurements
      if (levels.length > 10) {
        levels.shift();
      }
      
      this.audioLevels.set(peerId, levels);
      
      // Calculate average level
      const avgLevel = levels.reduce((sum, l) => sum + l, 0) / levels.length;
      
      if (avgLevel > this.audioThreshold) {
        currentLevels.push({ peerId, level: avgLevel });
        
        // Add to history
        this.speakerHistory.push({
          peerId,
          consumerId: '', // TODO: track consumer ID if needed
          audioLevel: avgLevel,
          timestamp: now
        });
      }
    });

    // Keep only recent history
    this.speakerHistory = this.speakerHistory.filter(
      info => now - info.timestamp < this.dominanceDuration * 2
    );

    // Determine dominant speaker
    if (currentLevels.length === 0) {
      // No one is speaking
      if (this.activeSpeaker) {
        this.setActiveSpeaker(null);
      }
      return;
    }

    // Find person with highest average audio level in recent history
    const speakerCounts = new Map<string, { count: number; totalLevel: number }>();
    
    const recentHistory = this.speakerHistory.filter(
      info => now - info.timestamp < this.dominanceDuration
    );
    
    for (const info of recentHistory) {
      const current = speakerCounts.get(info.peerId) || { count: 0, totalLevel: 0 };
      current.count++;
      current.totalLevel += info.audioLevel;
      speakerCounts.set(info.peerId, current);
    }

    // Find dominant speaker (highest average level + consistency)
    let dominantSpeaker: string | null = null;
    let maxScore = 0;
    
    speakerCounts.forEach((stats, peerId) => {
      // Score = average level * consistency factor
      const avgLevel = stats.totalLevel / stats.count;
      const consistencyFactor = stats.count / recentHistory.length;
      const score = avgLevel * consistencyFactor;
      
      if (score > maxScore && avgLevel > this.audioThreshold) {
        maxScore = score;
        dominantSpeaker = peerId;
      }
    });

    // Update active speaker if changed
    if (dominantSpeaker !== this.activeSpeaker) {
      this.setActiveSpeaker(dominantSpeaker);
    }
  }

  /**
   * Получить audio level из AnalyserNode
   */
  private getAudioLevel(analyser: AnalyserNode): number {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(dataArray);
    
    // Calculate RMS
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] * dataArray[i];
    }
    
    const rms = Math.sqrt(sum / dataArray.length);
    return rms / 255; // Normalize to 0-1
  }

  /**
   * Установить активного спикера
   */
  private setActiveSpeaker(peerId: string | null) {
    const previous = this.activeSpeaker;
    this.activeSpeaker = peerId;
    
    if (previous !== peerId) {
      console.log(`🎤 Active speaker changed: ${previous || 'none'} → ${peerId || 'none'}`);
      
      // Notify callback
      if (this.onActiveSpeakerChange) {
        this.onActiveSpeakerChange(peerId);
      }
      
      // Prioritize active speaker video
      if (this.mediasoupService && peerId) {
        this.prioritizeActiveSpeaker(peerId);
      }
    }
  }

  /**
   * Приоритизировать видео активного спикера
   */
  private async prioritizeActiveSpeaker(peerId: string) {
    if (!this.mediasoupService) return;

    const consumers = this.mediasoupService.getConsumers();
    
    for (const consumer of consumers) {
      if (consumer.kind !== 'video') continue;
      
      // Get peerId from consumer (через consumer metadata или mapping)
      // TODO: нужен способ связать consumer с peerId
      
      try {
        if (consumer.appData.peerId === peerId) {
          // Active speaker - high priority + high quality
          await this.mediasoupService.setConsumerPriority(consumer.id, 255);
          await this.mediasoupService.setConsumerPreferredLayers(consumer.id, 2, 2); // High quality
        } else {
          // Others - lower priority + medium quality
          await this.mediasoupService.setConsumerPriority(consumer.id, 128);
          await this.mediasoupService.setConsumerPreferredLayers(consumer.id, 1, 2); // Medium quality
        }
      } catch (error) {
        console.error('Failed to prioritize speaker:', error);
      }
    }
  }

  /**
   * Получить текущего активного спикера
   */
  getActiveSpeaker(): string | null {
    return this.activeSpeaker;
  }

  /**
   * Получить audio level для участника
   */
  getAudioLevelForPeer(peerId: string): number {
    const levels = this.audioLevels.get(peerId);
    if (!levels || levels.length === 0) return 0;
    
    return levels[levels.length - 1];
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopMonitoring();
    
    // Close all AudioContexts
    this.audioContexts.forEach((audioContext) => {
      audioContext.close();
    });
    
    this.audioContexts.clear();
    this.analyzers.clear();
    this.audioLevels.clear();
    this.speakerHistory = [];
    this.mediasoupService = null;
  }
}

export default new ActiveSpeakerDetector();

