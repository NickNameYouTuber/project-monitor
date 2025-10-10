/**
 * Metrics Collector
 * Собирает и экспортирует метрики для Prometheus
 */

class MetricsCollector {
  constructor() {
    this.metrics = {
      // Server metrics
      uptime: 0,
      workersCount: 0,
      
      // Room metrics
      activeRooms: 0,
      totalRoomsCreated: 0,
      totalRoomsClosed: 0,
      
      // Peer metrics
      activePeers: 0,
      totalPeersJoined: 0,
      totalPeersLeft: 0,
      
      // Transport metrics
      activeTransports: 0,
      totalTransportsCreated: 0,
      totalTransportsClosed: 0,
      
      // Producer metrics
      activeProducers: 0,
      totalProducersCreated: 0,
      totalProducersClosed: 0,
      audioProducers: 0,
      videoProducers: 0,
      
      // Consumer metrics
      activeConsumers: 0,
      totalConsumersCreated: 0,
      totalConsumersClosed: 0,
      
      // Error metrics
      totalErrors: 0,
      connectionErrors: 0,
      producerErrors: 0,
      consumerErrors: 0,
      
      // Bandwidth metrics
      totalBytesReceived: 0,
      totalBytesSent: 0
    };
    
    this.startTime = Date.now();
  }

  // Server metrics
  setWorkersCount(count) {
    this.metrics.workersCount = count;
  }

  // Room metrics
  incrementRoomsCreated() {
    this.metrics.totalRoomsCreated++;
    this.metrics.activeRooms++;
  }

  incrementRoomsClosed() {
    this.metrics.totalRoomsClosed++;
    this.metrics.activeRooms = Math.max(0, this.metrics.activeRooms - 1);
  }

  // Peer metrics
  incrementPeersJoined() {
    this.metrics.totalPeersJoined++;
    this.metrics.activePeers++;
  }

  incrementPeersLeft() {
    this.metrics.totalPeersLeft++;
    this.metrics.activePeers = Math.max(0, this.metrics.activePeers - 1);
  }

  // Transport metrics
  incrementTransportsCreated() {
    this.metrics.totalTransportsCreated++;
    this.metrics.activeTransports++;
  }

  incrementTransportsClosed() {
    this.metrics.totalTransportsClosed++;
    this.metrics.activeTransports = Math.max(0, this.metrics.activeTransports - 1);
  }

  // Producer metrics
  incrementProducersCreated(kind) {
    this.metrics.totalProducersCreated++;
    this.metrics.activeProducers++;
    
    if (kind === 'audio') {
      this.metrics.audioProducers++;
    } else if (kind === 'video') {
      this.metrics.videoProducers++;
    }
  }

  incrementProducersClosed(kind) {
    this.metrics.totalProducersClosed++;
    this.metrics.activeProducers = Math.max(0, this.metrics.activeProducers - 1);
    
    if (kind === 'audio') {
      this.metrics.audioProducers = Math.max(0, this.metrics.audioProducers - 1);
    } else if (kind === 'video') {
      this.metrics.videoProducers = Math.max(0, this.metrics.videoProducers - 1);
    }
  }

  // Consumer metrics
  incrementConsumersCreated() {
    this.metrics.totalConsumersCreated++;
    this.metrics.activeConsumers++;
  }

  incrementConsumersClosed() {
    this.metrics.totalConsumersClosed++;
    this.metrics.activeConsumers = Math.max(0, this.metrics.activeConsumers - 1);
  }

  // Error metrics
  incrementErrors(type = 'general') {
    this.metrics.totalErrors++;
    
    if (type === 'connection') {
      this.metrics.connectionErrors++;
    } else if (type === 'producer') {
      this.metrics.producerErrors++;
    } else if (type === 'consumer') {
      this.metrics.consumerErrors++;
    }
  }

  // Bandwidth metrics
  addBytesReceived(bytes) {
    this.metrics.totalBytesReceived += bytes;
  }

  addBytesSent(bytes) {
    this.metrics.totalBytesSent += bytes;
  }

  // Get metrics
  getMetrics() {
    this.metrics.uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return { ...this.metrics };
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics() {
    const metrics = this.getMetrics();
    
    return `
# HELP mediasoup_uptime_seconds Server uptime in seconds
# TYPE mediasoup_uptime_seconds counter
mediasoup_uptime_seconds ${metrics.uptime}

# HELP mediasoup_workers_total Number of MediaSoup workers
# TYPE mediasoup_workers_total gauge
mediasoup_workers_total ${metrics.workersCount}

# HELP mediasoup_rooms_active Number of active rooms
# TYPE mediasoup_rooms_active gauge
mediasoup_rooms_active ${metrics.activeRooms}

# HELP mediasoup_rooms_created_total Total rooms created
# TYPE mediasoup_rooms_created_total counter
mediasoup_rooms_created_total ${metrics.totalRoomsCreated}

# HELP mediasoup_rooms_closed_total Total rooms closed
# TYPE mediasoup_rooms_closed_total counter
mediasoup_rooms_closed_total ${metrics.totalRoomsClosed}

# HELP mediasoup_peers_active Number of active peers
# TYPE mediasoup_peers_active gauge
mediasoup_peers_active ${metrics.activePeers}

# HELP mediasoup_peers_joined_total Total peers joined
# TYPE mediasoup_peers_joined_total counter
mediasoup_peers_joined_total ${metrics.totalPeersJoined}

# HELP mediasoup_peers_left_total Total peers left
# TYPE mediasoup_peers_left_total counter
mediasoup_peers_left_total ${metrics.totalPeersLeft}

# HELP mediasoup_transports_active Number of active transports
# TYPE mediasoup_transports_active gauge
mediasoup_transports_active ${metrics.activeTransports}

# HELP mediasoup_transports_created_total Total transports created
# TYPE mediasoup_transports_created_total counter
mediasoup_transports_created_total ${metrics.totalTransportsCreated}

# HELP mediasoup_transports_closed_total Total transports closed
# TYPE mediasoup_transports_closed_total counter
mediasoup_transports_closed_total ${metrics.totalTransportsClosed}

# HELP mediasoup_producers_active Number of active producers
# TYPE mediasoup_producers_active gauge
mediasoup_producers_active ${metrics.activeProducers}

# HELP mediasoup_producers_active_by_kind Number of active producers by kind
# TYPE mediasoup_producers_active_by_kind gauge
mediasoup_producers_active_by_kind{kind="audio"} ${metrics.audioProducers}
mediasoup_producers_active_by_kind{kind="video"} ${metrics.videoProducers}

# HELP mediasoup_producers_created_total Total producers created
# TYPE mediasoup_producers_created_total counter
mediasoup_producers_created_total ${metrics.totalProducersCreated}

# HELP mediasoup_producers_closed_total Total producers closed
# TYPE mediasoup_producers_closed_total counter
mediasoup_producers_closed_total ${metrics.totalProducersClosed}

# HELP mediasoup_consumers_active Number of active consumers
# TYPE mediasoup_consumers_active gauge
mediasoup_consumers_active ${metrics.activeConsumers}

# HELP mediasoup_consumers_created_total Total consumers created
# TYPE mediasoup_consumers_created_total counter
mediasoup_consumers_created_total ${metrics.totalConsumersCreated}

# HELP mediasoup_consumers_closed_total Total consumers closed
# TYPE mediasoup_consumers_closed_total counter
mediasoup_consumers_closed_total ${metrics.totalConsumersClosed}

# HELP mediasoup_errors_total Total errors
# TYPE mediasoup_errors_total counter
mediasoup_errors_total ${metrics.totalErrors}

# HELP mediasoup_errors_by_type Total errors by type
# TYPE mediasoup_errors_by_type counter
mediasoup_errors_by_type{type="connection"} ${metrics.connectionErrors}
mediasoup_errors_by_type{type="producer"} ${metrics.producerErrors}
mediasoup_errors_by_type{type="consumer"} ${metrics.consumerErrors}

# HELP mediasoup_bytes_received_total Total bytes received
# TYPE mediasoup_bytes_received_total counter
mediasoup_bytes_received_total ${metrics.totalBytesReceived}

# HELP mediasoup_bytes_sent_total Total bytes sent
# TYPE mediasoup_bytes_sent_total counter
mediasoup_bytes_sent_total ${metrics.totalBytesSent}
`.trim();
  }

  // Export metrics in JSON format
  exportJsonMetrics() {
    return this.getMetrics();
  }

  // Reset metrics (useful for testing)
  reset() {
    Object.keys(this.metrics).forEach(key => {
      if (key !== 'uptime' && key !== 'workersCount') {
        this.metrics[key] = 0;
      }
    });
  }
}

module.exports = new MetricsCollector();

