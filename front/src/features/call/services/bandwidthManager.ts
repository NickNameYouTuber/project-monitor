/**
 * Bandwidth Manager
 * Динамическое управление качеством видео на основе доступной пропускной способности
 */

import type { Consumer } from 'mediasoup-client/lib/types';
import { MediaSoupService } from './mediasoupClient';

export interface BandwidthStats {
  timestamp: number;
  availableBitrate: number; // bits per second
  packetLoss: number; // percentage
  rtt: number; // round-trip time in ms
}

export type QualityLevel = 'low' | 'medium' | 'high' | 'auto';

export class BandwidthManager {
  private mediasoupService: MediaSoupService | null = null;
  private stats: BandwidthStats[] = [];
  private maxStatsHistory = 10;
  
  // Quality thresholds (bits per second)
  private readonly thresholds = {
    high: 1000000,    // 1 Mbps - можно использовать high quality (720p)
    medium: 500000,   // 500 Kbps - переключить на medium (360p)
    low: 250000       // 250 Kbps - переключить на low (180p)
  };
  
  // Packet loss thresholds
  private readonly packetLossThresholds = {
    good: 2,          // < 2% packet loss - все хорошо
    acceptable: 5,    // 2-5% - переключить на более низкое качество
    poor: 10          // > 10% - критично, максимально понизить качество
  };
  
  private monitoringInterval: NodeJS.Timeout | null = null;
  private currentQuality: QualityLevel = 'medium';

  constructor() {
    console.log('📊 BandwidthManager initialized');
  }

  /**
   * Установить MediaSoup service для управления
   */
  setMediaSoupService(service: MediaSoupService) {
    this.mediasoupService = service;
  }

  /**
   * Начать мониторинг bandwidth
   */
  startMonitoring(intervalMs: number = 3000) {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    console.log(`📡 Starting bandwidth monitoring (interval: ${intervalMs}ms)`);
    
    this.monitoringInterval = setInterval(() => {
      this.checkBandwidthAndAdjust();
    }, intervalMs);
  }

  /**
   * Остановить мониторинг
   */
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️  Bandwidth monitoring stopped');
    }
  }

  /**
   * Проверить bandwidth и скорректировать качество
   */
  private async checkBandwidthAndAdjust() {
    if (!this.mediasoupService) return;

    const consumers = this.mediasoupService.getConsumers();
    const videoConsumers = consumers.filter(c => c.kind === 'video');

    if (videoConsumers.length === 0) return;

    // Получить статистику от consumers
    for (const consumer of videoConsumers) {
      try {
        const stats = await consumer.getStats();
        const bandwidth = this.extractBandwidthFromStats(stats);
        
        if (bandwidth) {
          this.addStats(bandwidth);
          this.adjustQualityBasedOnStats(consumer);
        }
      } catch (error) {
        console.error('Failed to get consumer stats:', error);
      }
    }
  }

  /**
   * Извлечь bandwidth информацию из WebRTC stats
   */
  private extractBandwidthFromStats(stats: RTCStatsReport): BandwidthStats | null {
    let availableBitrate = 0;
    let packetLoss = 0;
    let rtt = 0;

    stats.forEach((report) => {
      if (report.type === 'inbound-rtp' && report.kind === 'video') {
        // Available bitrate
        if (report.bytesReceived !== undefined) {
          availableBitrate = report.bytesReceived * 8; // Convert to bits
        }
        
        // Packet loss
        if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
          const totalPackets = report.packetsLost + report.packetsReceived;
          if (totalPackets > 0) {
            packetLoss = (report.packetsLost / totalPackets) * 100;
          }
        }
      }
      
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        // RTT
        if (report.currentRoundTripTime !== undefined) {
          rtt = report.currentRoundTripTime * 1000; // Convert to ms
        }
      }
    });

    if (availableBitrate > 0) {
      return {
        timestamp: Date.now(),
        availableBitrate,
        packetLoss,
        rtt
      };
    }

    return null;
  }

  /**
   * Добавить статистику в историю
   */
  private addStats(stats: BandwidthStats) {
    this.stats.push(stats);
    
    // Keep only last N stats
    if (this.stats.length > this.maxStatsHistory) {
      this.stats.shift();
    }
  }

  /**
   * Получить среднюю bandwidth за последние N measurements
   */
  private getAverageBandwidth(): number {
    if (this.stats.length === 0) return 0;
    
    const sum = this.stats.reduce((acc, stat) => acc + stat.availableBitrate, 0);
    return sum / this.stats.length;
  }

  /**
   * Получить средний packet loss
   */
  private getAveragePacketLoss(): number {
    if (this.stats.length === 0) return 0;
    
    const sum = this.stats.reduce((acc, stat) => acc + stat.packetLoss, 0);
    return sum / this.stats.length;
  }

  /**
   * Определить оптимальное качество на основе bandwidth
   */
  private determineOptimalQuality(): QualityLevel {
    const avgBandwidth = this.getAverageBandwidth();
    const avgPacketLoss = this.getAveragePacketLoss();

    // Если packet loss слишком высокий, понизить качество
    if (avgPacketLoss > this.packetLossThresholds.poor) {
      console.log(`⚠️  High packet loss (${avgPacketLoss.toFixed(1)}%), reducing quality to LOW`);
      return 'low';
    }

    if (avgPacketLoss > this.packetLossThresholds.acceptable) {
      console.log(`⚠️  Moderate packet loss (${avgPacketLoss.toFixed(1)}%), reducing quality to MEDIUM`);
      return 'medium';
    }

    // Определить на основе bandwidth
    if (avgBandwidth >= this.thresholds.high) {
      return 'high';
    } else if (avgBandwidth >= this.thresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Скорректировать качество consumer на основе статистики
   */
  private async adjustQualityBasedOnStats(consumer: Consumer) {
    if (!this.mediasoupService) return;
    if (this.stats.length < 3) return; // Нужно минимум 3 measurement

    const optimalQuality = this.determineOptimalQuality();
    
    // Если качество изменилось, применить
    if (optimalQuality !== this.currentQuality) {
      console.log(`🎚️ Adjusting quality: ${this.currentQuality} → ${optimalQuality}`);
      this.currentQuality = optimalQuality;
      
      const layers = this.qualityToLayers(optimalQuality);
      
      try {
        await this.mediasoupService.setConsumerPreferredLayers(
          consumer.id,
          layers.spatialLayer,
          layers.temporalLayer
        );
        
        console.log(`✅ Quality adjusted to ${optimalQuality} (spatial: ${layers.spatialLayer})`);
      } catch (error) {
        console.error('Failed to adjust quality:', error);
      }
    }
  }

  /**
   * Конвертировать quality level в spatial/temporal layers
   */
  private qualityToLayers(quality: QualityLevel): { spatialLayer: number; temporalLayer: number } {
    switch (quality) {
      case 'low':
        return { spatialLayer: 0, temporalLayer: 2 }; // 180p
      case 'medium':
        return { spatialLayer: 1, temporalLayer: 2 }; // 360p
      case 'high':
        return { spatialLayer: 2, temporalLayer: 2 }; // 720p
      case 'auto':
      default:
        return { spatialLayer: 1, temporalLayer: 2 }; // Default to medium
    }
  }

  /**
   * Вручную установить качество (override auto)
   */
  async setQuality(quality: QualityLevel) {
    if (!this.mediasoupService) {
      throw new Error('MediaSoup service not set');
    }

    console.log(`🎛️ Manually setting quality to: ${quality}`);
    this.currentQuality = quality;

    const consumers = this.mediasoupService.getConsumers();
    const videoConsumers = consumers.filter(c => c.kind === 'video');

    const layers = this.qualityToLayers(quality);

    for (const consumer of videoConsumers) {
      try {
        await this.mediasoupService.setConsumerPreferredLayers(
          consumer.id,
          layers.spatialLayer,
          layers.temporalLayer
        );
      } catch (error) {
        console.error(`Failed to set quality for consumer ${consumer.id}:`, error);
      }
    }

    console.log(`✅ Quality set to ${quality} for ${videoConsumers.length} consumers`);
  }

  /**
   * Получить текущее качество
   */
  getCurrentQuality(): QualityLevel {
    return this.currentQuality;
  }

  /**
   * Получить текущую статистику
   */
  getCurrentStats(): BandwidthStats | null {
    if (this.stats.length === 0) return null;
    return this.stats[this.stats.length - 1];
  }

  /**
   * Получить рекомендуемое качество
   */
  getRecommendedQuality(): QualityLevel {
    if (this.stats.length < 3) return 'medium';
    return this.determineOptimalQuality();
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopMonitoring();
    this.stats = [];
    this.mediasoupService = null;
  }
}

export default new BandwidthManager();

