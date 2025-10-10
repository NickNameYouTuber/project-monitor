# MediaSoup SFU Server

MediaSoup-based Selective Forwarding Unit (SFU) server для NIMeet видеозвонков.

## Особенности

- 🚀 SFU архитектура для масштабируемых видеозвонков
- 🔄 Поддержка неограниченного количества участников
- 📊 Simulcast для адаптивного качества видео
- 🔌 Horizontal scaling через Redis
- 💪 Graceful shutdown и автоматическая очистка ресурсов
- 📡 WebRTC transport с STUN/TURN support

## Архитектура

```
┌─────────────┐         ┌──────────────────┐
│   Client 1  │─────────┤                  │
├─────────────┤         │  MediaSoup SFU   │
│   Client 2  │─────────┤     Server       │
├─────────────┤         │                  │
│   Client N  │─────────┤                  │
└─────────────┘         └──────────────────┘
                               │
                        ┌──────┴──────┐
                        │    Redis    │
                        └─────────────┘
```

## Установка

```bash
npm install
```

## Конфигурация

Создайте `.env` файл на основе `.env.example`:

```env
PORT=4001
REDIS_URL=redis://:password@localhost:6379
ANNOUNCED_IP=YOUR_PUBLIC_IP
RTC_MIN_PORT=40000
RTC_MAX_PORT=40100
```

**Важно:** `ANNOUNCED_IP` должен быть публичным IP вашего сервера для работы через NAT.

## Запуск

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Docker
```bash
docker-compose up mediasoup-server
```

## API

### Socket.IO Events

#### Client → Server

**`mediasoup:join-room`**
```javascript
socket.emit('mediasoup:join-room', {
  roomId: 'room123',
  rtpCapabilities: device.rtpCapabilities
}, (response) => {
  // response: {routerRtpCapabilities, sendTransportParams, recvTransportParams, existingProducers}
});
```

**`mediasoup:produce`**
```javascript
socket.emit('mediasoup:produce', {
  kind: 'audio', // or 'video'
  rtpParameters: track.rtpParameters
}, (response) => {
  // response: {producerId}
});
```

**`mediasoup:consume`**
```javascript
socket.emit('mediasoup:consume', {
  producerId: 'producer-id',
  rtpCapabilities: device.rtpCapabilities
}, (response) => {
  // response: {id, kind, rtpParameters, ...}
});
```

#### Server → Client

**`mediasoup:new-producer`**
```javascript
socket.on('mediasoup:new-producer', ({peerId, producerId, kind}) => {
  // Новый участник начал отправку медиа
});
```

**`mediasoup:peer-left`**
```javascript
socket.on('mediasoup:peer-left', ({peerId}) => {
  // Участник покинул комнату
});
```

## Health Check

```bash
curl http://localhost:4001/health
```

Response:
```json
{
  "status": "ok",
  "uptime": 12345,
  "rooms": [
    {"roomId": "room1", "peerCount": 3, "uptime": 5000}
  ]
}
```

## Performance Tips

1. **Worker Threads**: Количество workers автоматически определяется по CPU cores
2. **Port Range**: Увеличьте диапазон портов для большего количества participants
3. **Redis**: Используйте Redis для horizontal scaling
4. **TURN Server**: Обязателен для работы за NAT/Firewall

## Troubleshooting

### Проблема: Не удается подключиться

**Решение**: Проверьте `ANNOUNCED_IP` - он должен быть доступен снаружи.

### Проблема: Видео не идет

**Решение**: Убедитесь что порты RTP (40000-40100) открыты в firewall.

### Проблема: High CPU usage

**Решение**: Увеличьте количество workers или используйте load balancer.

## Мониторинг

Для production рекомендуется настроить:
- Prometheus metrics
- Log aggregation (ELK/Loki)
- Alerting на high CPU/Memory

## Лицензия

ISC

