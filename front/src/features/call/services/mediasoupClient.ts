/**
 * MediaSoup Client Service
 * Управляет MediaSoup Device, Transports, Producers и Consumers
 */

import { Device } from 'mediasoup-client';
import type {
  Transport,
  Producer,
  Consumer,
  RtpCapabilities,
  MediaKind
} from 'mediasoup-client/lib/types';
import type { Socket } from 'socket.io-client';

export interface MediaSoupConfig {
  socket: Socket;
  roomId: string;
}

export class MediaSoupService {
  private device: Device | null = null;
  private socket: Socket;
  private roomId: string;
  
  // Transports
  private sendTransport: Transport | null = null;
  private recvTransport: Transport | null = null;
  
  // Media producers/consumers
  private producers: Map<MediaKind, Producer> = new Map();
  private consumers: Map<string, Consumer> = new Map();
  
  // Callbacks
  private onNewProducer?: (peerId: string, producerId: string, kind: MediaKind) => void;
  private onPeerLeft?: (peerId: string) => void;
  private onProducerClosed?: (peerId: string, producerId: string) => void;
  private onConsumerCreated?: (consumer: Consumer, peerId: string) => void;

  constructor(config: MediaSoupConfig) {
    this.socket = config.socket;
    this.roomId = config.roomId;
  }

  /**
   * Инициализация MediaSoup Device
   */
  async init(): Promise<void> {
    console.log('🚀 Инициализация MediaSoup Device...');
    
    this.device = new Device();
    
    // Get RTP capabilities from server
    const rtpCapabilities = await this.getRtpCapabilities();
    
    // Load device with RTP capabilities
    await this.device.load({ routerRtpCapabilities: rtpCapabilities });
    
    console.log('✅ MediaSoup Device инициализирован');
  }

  /**
   * Присоединение к комнате
   */
  async joinRoom(): Promise<void> {
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    console.log(`🏠 Присоединение к комнате ${this.roomId}...`);

    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:join-room', {
        roomId: this.roomId,
        rtpCapabilities: this.device!.rtpCapabilities
      }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error || 'Failed to join room'));
          return;
        }

        try {
          // Create transports
          await this.createSendTransport(response.sendTransportParams);
          await this.createRecvTransport(response.recvTransportParams);
          
          // Setup server event listeners
          this.setupSocketListeners();
          
          // Consume existing producers
          for (const { peerId, producerId, kind } of response.existingProducers) {
            await this.consume(producerId, peerId);
          }
          
          console.log(`✅ Присоединился к комнате ${this.roomId}`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Создание send transport
   */
  private async createSendTransport(params: any): Promise<void> {
    console.log('📤 Создание send transport...');
    
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    this.sendTransport = this.device.createSendTransport(params);

    // Connect transport when receiving 'connect' event
    this.sendTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.connectTransport('send', dtlsParameters);
        callback();
      } catch (error: any) {
        errback(error);
      }
    });

    // Send track when receiving 'produce' event
    this.sendTransport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
      try {
        const producerId = await this.produceTrack(kind as MediaKind, rtpParameters);
        callback({ id: producerId });
      } catch (error: any) {
        errback(error);
      }
    });

    this.sendTransport.on('connectionstatechange', (state) => {
      console.log(`📡 Send transport state: ${state}`);
      
      // АГРЕССИВНОЕ ПЕРЕПОДКЛЮЧЕНИЕ при failed/disconnected
      if (state === 'failed' || state === 'disconnected') {
        console.warn(`⚠️ Send transport ${state}, attempting aggressive recovery...`);
        this.reconnectTransport('send').catch(error => {
          console.error('Failed to reconnect send transport:', error);
        });
      }
    });

    console.log('✅ Send transport создан');
  }

  /**
   * Создание recv transport
   */
  private async createRecvTransport(params: any): Promise<void> {
    console.log('📥 Создание recv transport...');
    
    if (!this.device) {
      throw new Error('Device not initialized');
    }

    this.recvTransport = this.device.createRecvTransport(params);

    // Connect transport when receiving 'connect' event
    this.recvTransport.on('connect', async ({ dtlsParameters }, callback, errback) => {
      try {
        await this.connectTransport('recv', dtlsParameters);
        callback();
      } catch (error: any) {
        errback(error);
      }
    });

    this.recvTransport.on('connectionstatechange', (state) => {
      console.log(`📡 Recv transport state: ${state}`);
      
      // АГРЕССИВНОЕ ПЕРЕПОДКЛЮЧЕНИЕ при failed/disconnected
      if (state === 'failed' || state === 'disconnected') {
        console.warn(`⚠️ Recv transport ${state}, attempting aggressive recovery...`);
        this.reconnectTransport('recv').catch(error => {
          console.error('Failed to reconnect recv transport:', error);
        });
      }
    });

    console.log('✅ Recv transport создан');
  }

  /**
   * Подключение transport
   */
  private connectTransport(type: 'send' | 'recv', dtlsParameters: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const event = type === 'send' 
        ? 'mediasoup:connect-send-transport' 
        : 'mediasoup:connect-recv-transport';
      
      this.socket.emit(event, { dtlsParameters }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Получение RTP capabilities от сервера
   */
  private getRtpCapabilities(): Promise<RtpCapabilities> {
    // RTP capabilities будут получены в joinRoom
    return Promise.resolve({} as RtpCapabilities);
  }

  /**
   * Отправка медиа track (produce)
   */
  async produce(track: MediaStreamTrack, kind: MediaKind): Promise<string> {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    console.log(`🎬 Отправка ${kind} track...`);

    // Enable simulcast for video
    const produceOptions: any = { track };
    
    if (kind === 'video') {
      produceOptions.encodings = [
        { 
          rid: 'r0',
          maxBitrate: 100000, 
          scaleResolutionDownBy: 4.0,
          scalabilityMode: 'S1T3'
        },
        { 
          rid: 'r1',
          maxBitrate: 300000, 
          scaleResolutionDownBy: 2.0,
          scalabilityMode: 'S1T3'
        },
        { 
          rid: 'r2',
          maxBitrate: 900000, 
          scaleResolutionDownBy: 1.0,
          scalabilityMode: 'S1T3'
        }
      ];
      produceOptions.codecOptions = {
        videoGoogleStartBitrate: 1000
      };
      
      console.log('🎚️ Simulcast enabled with 3 layers (180p, 360p, 720p)');
    }

    const producer = await this.sendTransport.produce(produceOptions);
    this.producers.set(kind, producer);

    producer.on('transportclose', () => {
      console.log(`🗑️ Producer transport closed (${kind})`);
      this.producers.delete(kind);
    });

    producer.on('trackended', () => {
      console.log(`🔴 Producer track ended (${kind})`);
      this.closeProducer(kind);
    });

    console.log(`✅ Producer создан: ${producer.id} (${kind})`);
    return producer.id;
  }

  /**
   * Produce track на сервере
   */
  private produceTrack(kind: MediaKind, rtpParameters: any): Promise<string> {
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:produce', {
        kind,
        rtpParameters
      }, (response: any) => {
        if (response.success) {
          resolve(response.producerId);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Получение медиа от другого участника (consume)
   */
  async consume(producerId: string, peerId: string): Promise<void> {
    if (!this.recvTransport || !this.device) {
      throw new Error('Recv transport or device not initialized');
    }

    console.log(`🍿 Подписка на producer ${producerId} от ${peerId}...`);

    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:consume', {
        producerId,
        rtpCapabilities: this.device!.rtpCapabilities
      }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error));
          return;
        }

        try {
          const consumer = await this.recvTransport!.consume({
            id: response.id,
            producerId: response.producerId,
            kind: response.kind,
            rtpParameters: response.rtpParameters
          });

          this.consumers.set(consumer.id, consumer);

          consumer.on('transportclose', () => {
            console.log(`🗑️ Consumer transport closed: ${consumer.id}`);
            this.consumers.delete(consumer.id);
          });

          // Resume consumer
          await this.resumeConsumer(consumer.id);

          // Callback для обработки нового consumer
          if (this.onConsumerCreated) {
            this.onConsumerCreated(consumer, peerId);
          }

          console.log(`✅ Consumer создан: ${consumer.id} (${consumer.kind})`);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Resume consumer
   */
  private resumeConsumer(consumerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:resume-consumer', { consumerId }, (response: any) => {
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Закрытие producer
   */
  async closeProducer(kind: MediaKind): Promise<void> {
    const producer = this.producers.get(kind);
    if (!producer) return;

    console.log(`🗑️ Закрытие producer (${kind})...`);

    return new Promise((resolve) => {
      this.socket.emit('mediasoup:close-producer', { kind }, (response: any) => {
        producer.close();
        this.producers.delete(kind);
        console.log(`✅ Producer закрыт (${kind})`);
        resolve();
      });
    });
  }

  /**
   * Setup socket event listeners
   */
  private setupSocketListeners(): void {
    // New producer from another peer
    this.socket.on('mediasoup:new-producer', ({ peerId, producerId, kind }) => {
      console.log(`📢 Новый producer от ${peerId}: ${producerId} (${kind})`);
      
      // Consume this producer
      this.consume(producerId, peerId).catch(console.error);
      
      if (this.onNewProducer) {
        this.onNewProducer(peerId, producerId, kind);
      }
    });

    // Peer left
    this.socket.on('mediasoup:peer-left', ({ peerId }) => {
      console.log(`👋 Peer покинул комнату: ${peerId}`);
      
      if (this.onPeerLeft) {
        this.onPeerLeft(peerId);
      }
    });

    // Producer closed
    this.socket.on('mediasoup:producer-closed', ({ peerId, producerId }) => {
      console.log(`🗑️ Producer закрыт: ${producerId} от ${peerId}`);
      
      // Close and remove consumer
      const consumer = Array.from(this.consumers.values())
        .find(c => c.producerId === producerId);
      
      if (consumer) {
        consumer.close();
        this.consumers.delete(consumer.id);
      }
      
      if (this.onProducerClosed) {
        this.onProducerClosed(peerId, producerId);
      }
    });
  }

  /**
   * Установка callbacks
   */
  setCallbacks(callbacks: {
    onNewProducer?: (peerId: string, producerId: string, kind: MediaKind) => void;
    onPeerLeft?: (peerId: string) => void;
    onProducerClosed?: (peerId: string, producerId: string) => void;
    onConsumerCreated?: (consumer: Consumer, peerId: string) => void;
  }): void {
    this.onNewProducer = callbacks.onNewProducer;
    this.onPeerLeft = callbacks.onPeerLeft;
    this.onProducerClosed = callbacks.onProducerClosed;
    this.onConsumerCreated = callbacks.onConsumerCreated;
  }

  /**
   * Получение producer по типу
   */
  getProducer(kind: MediaKind): Producer | undefined {
    return this.producers.get(kind);
  }

  /**
   * Получение всех consumers
   */
  getConsumers(): Consumer[] {
    return Array.from(this.consumers.values());
  }

  /**
   * Установить предпочитаемые слои для consumer (simulcast quality control)
   */
  async setConsumerPreferredLayers(
    consumerId: string,
    spatialLayer: number,
    temporalLayer: number = 2
  ): Promise<void> {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    if (consumer.kind !== 'video') {
      throw new Error('Can only set layers for video consumers');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:set-consumer-layers', {
        consumerId,
        spatialLayer,
        temporalLayer
      }, (response: any) => {
        if (response.success) {
          console.log(`🎚️ Consumer layers set: ${consumerId}, spatial: ${spatialLayer}, temporal: ${temporalLayer}`);
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Установить приоритет consumer (для bandwidth management)
   */
  async setConsumerPriority(consumerId: string, priority: number): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:set-consumer-priority', {
        consumerId,
        priority
      }, (response: any) => {
        if (response.success) {
          console.log(`⭐ Consumer priority set: ${consumerId}, priority: ${priority}`);
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Запросить ключевой кадр (для быстрого восстановления качества)
   */
  async requestKeyFrame(consumerId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:request-keyframe', {
        consumerId
      }, (response: any) => {
        if (response.success) {
          console.log(`🔑 KeyFrame requested for consumer: ${consumerId}`);
          resolve();
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  /**
   * Покинуть комнату
   */
  leaveRoom(): void {
    console.log('👋 Покидаем комнату...');
    
    // Close all producers (forEach вместо for...of для TypeScript)
    this.producers.forEach((producer) => {
      producer.close();
    });
    this.producers.clear();
    
    // Close all consumers
    this.consumers.forEach((consumer) => {
      consumer.close();
    });
    this.consumers.clear();
    
    // Close transports
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }
    
    // Emit leave event
    this.socket.emit('mediasoup:leave-room');
    
    console.log('✅ Комната покинута');
  }

  /**
   * АГРЕССИВНОЕ ПЕРЕПОДКЛЮЧЕНИЕ (2 сек retry, 10 попыток)
   */
  private async reconnectTransport(transportType: 'send' | 'recv', attempt: number = 1): Promise<void> {
    const maxAttempts = 10;
    const retryDelay = 2000; // 2 секунды фиксированный delay
    
    if (attempt > maxAttempts) {
      console.error(`❌ Failed to reconnect ${transportType} transport after ${maxAttempts} attempts`);
      return;
    }
    
    try {
      console.log(`🔄 Reconnect attempt ${attempt}/${maxAttempts} for ${transportType} transport`);
      
      // Пересоздать transport
      if (transportType === 'send') {
        await this.recreateSendTransport();
      } else {
        await this.recreateRecvTransport();
      }
      
      console.log(`✅ ${transportType} transport reconnected on attempt ${attempt}`);
    } catch (error) {
      console.error(`❌ Reconnect attempt ${attempt} failed:`, error);
      setTimeout(() => this.reconnectTransport(transportType, attempt + 1), retryDelay);
    }
  }

  /**
   * Пересоздание Send Transport с восстановлением producers
   */
  private async recreateSendTransport(): Promise<void> {
    console.log('🔧 Recreating send transport...');
    
    // Сохранить текущие tracks
    const tracks = new Map<string, MediaStreamTrack>();
    this.producers.forEach((producer, kind) => {
      if (producer.track) {
        tracks.set(kind, producer.track);
      }
      producer.close();
    });
    this.producers.clear();
    
    // Закрыть старый transport
    if (this.sendTransport) {
      this.sendTransport.close();
      this.sendTransport = null;
    }
    
    // Создать новый transport
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:recreate-transport', {
        type: 'send'
      }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error || 'Failed to recreate send transport'));
          return;
        }
        
        try {
          // Создать новый send transport
          await this.createSendTransport(response.transportParams);
          
          // Восстановить producers из сохраненных tracks
          const producersToRestore: Promise<string>[] = [];
          tracks.forEach((track, kind) => {
            if (track.readyState === 'live') {
              console.log(`🔄 Restoring producer for ${kind}...`);
              producersToRestore.push(this.produce(track, kind as any));
            }
          });
          
          await Promise.all(producersToRestore);
          console.log('✅ Send transport recreated with all producers restored');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Пересоздание Recv Transport
   */
  private async recreateRecvTransport(): Promise<void> {
    console.log('🔧 Recreating recv transport...');
    
    // Закрыть все consumers
    this.consumers.forEach((consumer) => {
      consumer.close();
    });
    this.consumers.clear();
    
    // Закрыть старый transport
    if (this.recvTransport) {
      this.recvTransport.close();
      this.recvTransport = null;
    }
    
    // Создать новый transport
    return new Promise((resolve, reject) => {
      this.socket.emit('mediasoup:recreate-transport', {
        type: 'recv'
      }, async (response: any) => {
        if (!response.success) {
          reject(new Error(response.error || 'Failed to recreate recv transport'));
          return;
        }
        
        try {
          // Создать новый recv transport
          await this.createRecvTransport(response.transportParams);
          
          // Consumers восстановятся через 'mediasoup:new-producer' события от сервера
          console.log('✅ Recv transport recreated, waiting for server to resend producers...');
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.leaveRoom();
    this.device = null;
  }
}

