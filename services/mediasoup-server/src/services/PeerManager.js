const config = require('../config/mediasoup');

class Peer {
  constructor(socketId, roomId, router) {
    this.id = socketId;
    this.roomId = roomId;
    this.router = router;
    
    // Transports
    this.sendTransport = null;
    this.recvTransport = null;
    
    // Media
    this.producers = new Map(); // kind -> Producer
    this.consumers = new Map(); // consumerId -> Consumer
    
    this.closed = false;
  }

  async createSendTransport() {
    console.log(`📤 Создание send transport для ${this.id}`);
    
    const transport = await this.router.createWebRtcTransport(
      config.webRtcTransport
    );

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        console.log(`🔒 Send transport closed для ${this.id}`);
        transport.close();
      }
    });

    transport.on('@close', () => {
      console.log(`🗑️  Send transport закрыт для ${this.id}`);
    });

    this.sendTransport = transport;
    
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async createRecvTransport() {
    console.log(`📥 Создание recv transport для ${this.id}`);
    
    const transport = await this.router.createWebRtcTransport(
      config.webRtcTransport
    );

    transport.on('dtlsstatechange', (dtlsState) => {
      if (dtlsState === 'closed') {
        console.log(`🔒 Recv transport closed для ${this.id}`);
        transport.close();
      }
    });

    transport.on('@close', () => {
      console.log(`🗑️  Recv transport закрыт для ${this.id}`);
    });

    this.recvTransport = transport;
    
    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters
    };
  }

  async connectSendTransport(dtlsParameters) {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }
    
    await this.sendTransport.connect({ dtlsParameters });
    console.log(`✅ Send transport connected для ${this.id}`);
  }

  async connectRecvTransport(dtlsParameters) {
    if (!this.recvTransport) {
      throw new Error('Recv transport not created');
    }
    
    await this.recvTransport.connect({ dtlsParameters });
    console.log(`✅ Recv transport connected для ${this.id}`);
  }

  async produce(kind, rtpParameters) {
    if (!this.sendTransport) {
      throw new Error('Send transport not created');
    }

    console.log(`🎬 Создание producer (${kind}) для ${this.id}`);
    
    const producer = await this.sendTransport.produce({
      kind,
      rtpParameters
    });

    producer.on('transportclose', () => {
      console.log(`🗑️  Producer transport closed (${kind}) для ${this.id}`);
      this.producers.delete(kind);
    });

    this.producers.set(kind, producer);
    console.log(`✅ Producer (${kind}) создан для ${this.id}, ID: ${producer.id}`);
    
    return producer.id;
  }

  async consume(producerId, rtpCapabilities) {
    if (!this.recvTransport) {
      throw new Error('Recv transport not created');
    }

    // Check if we can consume
    if (!this.router.canConsume({ producerId, rtpCapabilities })) {
      throw new Error('Cannot consume');
    }

    console.log(`🍿 Создание consumer для ${this.id}, producer: ${producerId}`);
    
    const consumer = await this.recvTransport.consume({
      producerId,
      rtpCapabilities,
      paused: true // Start paused, client will resume
    });

    consumer.on('transportclose', () => {
      console.log(`🗑️  Consumer transport closed для ${this.id}`);
      this.consumers.delete(consumer.id);
    });

    consumer.on('producerclose', () => {
      console.log(`🗑️  Producer closed для consumer ${consumer.id}`);
      this.consumers.delete(consumer.id);
    });

    this.consumers.set(consumer.id, consumer);
    console.log(`✅ Consumer создан для ${this.id}, ID: ${consumer.id}`);
    
    return {
      id: consumer.id,
      producerId,
      kind: consumer.kind,
      rtpParameters: consumer.rtpParameters,
      type: consumer.type,
      producerPaused: consumer.producerPaused
    };
  }

  async resumeConsumer(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.resume();
    console.log(`▶️  Consumer resumed: ${consumerId} для ${this.id}`);
  }

  async pauseConsumer(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.pause();
    console.log(`⏸️  Consumer paused: ${consumerId} для ${this.id}`);
  }

  async setConsumerPreferredLayers(consumerId, spatialLayer, temporalLayer) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    if (consumer.kind !== 'video') {
      throw new Error('Can only set preferred layers for video consumers');
    }

    await consumer.setPreferredLayers({ spatialLayer, temporalLayer });
    console.log(`🎚️  Consumer layers set: ${consumerId}, spatial: ${spatialLayer}, temporal: ${temporalLayer}`);
  }

  async setConsumerPriority(consumerId, priority) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.setPriority(priority);
    console.log(`⭐ Consumer priority set: ${consumerId}, priority: ${priority}`);
  }

  async requestConsumerKeyFrame(consumerId) {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) {
      throw new Error('Consumer not found');
    }

    await consumer.requestKeyFrame();
    console.log(`🔑 KeyFrame requested for consumer: ${consumerId}`);
  }

  async closeProducer(kind) {
    const producer = this.producers.get(kind);
    if (!producer) return;

    producer.close();
    this.producers.delete(kind);
    console.log(`🗑️  Producer (${kind}) closed для ${this.id}`);
  }

  close() {
    if (this.closed) return;
    
    console.log(`🗑️  Закрытие peer ${this.id}...`);
    
    // Close all producers
    for (const producer of this.producers.values()) {
      producer.close();
    }
    this.producers.clear();
    
    // Close all consumers
    for (const consumer of this.consumers.values()) {
      consumer.close();
    }
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
    
    this.closed = true;
    console.log(`✅ Peer ${this.id} закрыт`);
  }

  getStats() {
    return {
      id: this.id,
      roomId: this.roomId,
      producers: Array.from(this.producers.keys()),
      consumers: this.consumers.size,
      hasSendTransport: !!this.sendTransport,
      hasRecvTransport: !!this.recvTransport
    };
  }
}

module.exports = Peer;

