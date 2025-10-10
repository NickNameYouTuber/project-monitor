# Быстрая активация MediaSoup в project-monitor

## Шаг 1: Настроить .env файлы

### Frontend
**Файл**: `project-monitor/front/.env`

```env
REACT_APP_USE_MEDIASOUP=true
REACT_APP_SOCKET_URL=https://meet.nicorp.tech
```

### Backend  
**Файл**: `project-monitor/services/nimeet-backend/.env`

```env
USE_MEDIASOUP=true
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/nimeet
REDIS_URL=redis://redis:6379
```

---

## Шаг 2: Установить зависимости

```bash
cd project-monitor/front
npm install
```

---

## Шаг 3: Запустить через Docker

```bash
cd project-monitor
docker-compose up -d
```

**Сервисы**:
- MediaSoup Server: порт 4001
- NIMeet Backend: порт 3001
- Frontend: порт 3000

---

## Шаг 4: Проверить работу

### Откройте звонок
1. Перейдите на https://meet.nicorp.tech
2. Создайте звонок или присоединитесь к существующему
3. В консоли должно быть:
   ```
   🔧 WebRTC Mode: MediaSoup SFU
   🚀 Инициализация MediaSoup Device...
   ✅ MediaSoup Device инициализирован
   📡 Send transport state: connected
   ```

### Debug Panel (Ctrl+Shift+D)
Нажмите `Ctrl+Shift+D` для открытия панели мониторинга:
- Transports состояния
- Producers/Consumers
- Reconnect attempts
- Errors log

---

## Rollback на Mesh P2P

Если что-то не работает:

```env
# Frontend .env
REACT_APP_USE_MEDIASOUP=false

# Backend .env
USE_MEDIASOUP=false
```

Перезапустить:
```bash
docker-compose restart nimeet-backend front
```

---

## Решенные проблемы

✅ **Дублирование участников** - фильтрация по userId, выбор последнего socketId
✅ **Glare condition** - серверная координация offers
✅ **Connection instability** - агрессивное переподключение (2 сек retry)
✅ **Track failures** - auto-recovery при onended + heartbeat
✅ **Сортировка** - локальный → raised hands → остальные

---

## Логи для проверки

### Успешная инициализация MediaSoup:
```
🔧 WebRTC Mode: MediaSoup SFU
🚀 Инициализация MediaSoup Device...
🏠 Присоединение к комнате christogram...
📤 Создание send transport...
✅ Send transport создан
📥 Создание recv transport...
✅ Recv transport создан
🎬 Отправка video track...
🎚️ Simulcast enabled with 3 layers (180p, 360p, 720p)
✅ Producer создан: abc123 (video)
✅ Присоединился к комнате christogram
```

### Успешное переподключение:
```
⚠️ Send transport failed, attempting aggressive recovery...
🔄 Reconnect attempt 1/10 for send transport
🔧 Recreating send transport...
🔄 Restoring producer for video...
✅ Send transport recreated with all producers restored
✅ send transport reconnected on attempt 1
```

### Устранение дублирования:
```
VideoGrid рендер:
  participantsSize: 2
  uniqueParticipantsSize: 1  ← один уникальный userId
  participantSocketIds: ['ABC', 'XYZ']  ← два socketId
  uniqueSocketIds: ['XYZ']  ← выбран последний
```

---

## Поддержка

Если возникли проблемы:
1. Проверьте логи в консоли браузера
2. Откройте ConnectionDebugPanel (Ctrl+Shift+D)
3. Проверьте логи Docker: `docker-compose logs -f mediasoup-server nimeet-backend`
4. Проверьте что все .env переменные установлены

**Документация**: `MEDIASOUP_MIGRATION_COMPLETE.md`

