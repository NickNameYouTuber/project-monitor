# Архитектура WebRTC звонков

## Обзор

Система звонков использует WebRTC для peer-to-peer передачи аудио/видео между участниками. Сигналинг выполняется через Socket.IO сервер (`signaling/server.js`), который работает на порту 7673.

## Компоненты

### 1. Signaling Server (`signaling/server.js`)
- **Порт**: 7673
- **Технологии**: Node.js, Express, Socket.IO
- **Функции**:
  - Управление комнатами (joinRoom, leaveRoom)
  - Ретрансляция offer/answer/candidate между пирами
  - Хранение и рассылка displayName участников (intro/userIntro)
  - Рассылка состояния screen sharing (screenState)

### 2. Frontend WebRTC Logic (`front/src/utils/call-connect.ts`)
- **Экспортируемые функции**:
  - `initCallConnect(options?)` - инициализация WebRTC клиента
  - `leaveCallConnect()` - выход из звонка (через window)
  - `callApplyPrejoin(mic, cam)` - применение настроек prejoin (через window)

- **Глобальные переменные**:
  - `localStream: MediaStream | null` - объединённый поток (audio + camera + screen)
  - `cameraStream: MediaStream | null` - поток с камеры
  - `screenStream: MediaStream | null` - поток демонстрации экрана
  - `peers: Record<peerId, RTCPeerConnection>` - карта подключений к другим участникам
  - `micEnabled, camEnabled, screenEnabled: boolean` - состояние локальных медиа
  - `peerNames: Record<peerId, displayName>` - имена участников
  - `peerScreenState: Record<peerId, boolean>` - состояние screen sharing у других участников

### 3. React Components

#### `CallPage.tsx`
- Главная страница звонка (`/call/:roomId`)
- Содержит DOM-элементы с фиксированными ID, которые используются `call-connect.ts`:
  - `#status` - статус подключения
  - `#roomId` - input для room ID
  - `#joinRoom` - кнопка входа в комнату
  - `#ctrlMic, #ctrlCam, #ctrlScreen, #ctrlLeave` - кнопки управления медиа
  - `#activeScreen` - видео элемент для демонстрации экрана
  - `#remotes` - контейнер плиток участников

#### `PreJoinPage.tsx`
- Страница предварительной настройки (`/prejoin/:roomId`)
- Позволяет включить/выключить камеру и микрофон перед входом
- Сохраняет выбор в `window.prejoinSettings`
- Переходит на `/call/:roomId` при нажатии "Join"

#### `Initializer.tsx`
- Вызывает `initCallConnect()` при монтировании
- Применяет prejoin настройки через `callApplyPrejoin()`
- Автоматически нажимает кнопку `#joinRoom` с переданным `roomId`
- При размонтировании вызывает `leaveCallConnect()`

## Поток данных

### 1. Вход в звонок

```
PreJoinPage (выбор mic/cam)
  ↓ сохраняет в window.prejoinSettings
  ↓ navigate('/call/:roomId')
CallPage монтируется
  ↓ рендерит DOM элементы
Initializer монтируется
  ↓ initCallConnect()
  ↓ нажимает #joinRoom
  ↓ socket.emit('joinRoom', roomId)
  ↓ socket.emit('intro', { roomId, name })
  ↓ callApplyPrejoin(mic, cam) → включает/выключает медиа
```

### 2. WebRTC Negotiation (Переговоры)

#### Проблема: Race Condition
**Старая логика**: При `userJoined` вызывался `attachLocalToPeersAndRenegotiate()`, который пытался создать offer для ВСЕХ пиров, в том числе для того, который только что присоединился. Это приводило к **двум одновременным offer** для одного пира:
- Один от `userJoined` (новый участник)
- Один от `attachLocalToPeersAndRenegotiate()` (существующий участник)

Результат: `InvalidStateError: Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': Failed to set remote answer sdp: Called in wrong state: stable`

#### Решение: Negotiation Queue
**Новая логика**: Каждый `RTCPeerConnection` имеет флаг `_makingOffer` (Perfect Negotiation Pattern). Перед созданием offer проверяем этот флаг и пропускаем, если уже идёт переговор.

```typescript
async function makeOffer(peerId: string) {
  const pc = peers[peerId];
  if (!pc || pc._makingOffer || pc.signalingState !== 'stable') {
    console.log('[CALL] skip offer for', peerId, 'state:', pc?.signalingState, 'making:', pc?._makingOffer);
    return;
  }
  pc._makingOffer = true;
  try {
    await assignLocalTracksToPeer(peerId, pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('offer', { to: peerId, offer: pc.localDescription });
  } finally {
    pc._makingOffer = false;
  }
}
```

### 3. Track Source Marking

**Проблема**: Невозможно отличить camera track от screen track на receiver стороне, т.к. оба имеют `kind: 'video'`.

**Решение**: Явная маркировка треков через кастомное свойство `_source`:

```typescript
function markTrackSource(track: MediaStreamTrack, source: 'camera' | 'screen' | 'audio') {
  (track as any)._source = source;
  console.log(`[CALL] marked track ${track.kind} as ${source} (label: ${track.label})`);
}

function getTrackSource(track: MediaStreamTrack): 'camera' | 'screen' | 'audio' | 'unknown' {
  return (track as any)._source || 'unknown';
}
```

При создании stream:
```typescript
// Camera
const cam = await navigator.mediaDevices.getUserMedia({ video: true });
cam.getVideoTracks().forEach(t => markTrackSource(t, 'camera'));

// Screen
const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
screen.getVideoTracks().forEach(t => markTrackSource(t, 'screen'));
```

### 4. Stable M-Line Order & Transceiver Management

**Проблема**: 
- При каждом `createOffer()` порядок m-lines (audio, video, video) мог меняться, что приводило к ошибке "The order of m-lines in answer doesn't match order in offer".
- При collision (оба пира создают offer одновременно), transceivers дублировались — offerer создавал [0,1,2], затем answerer при `setRemoteDescription()` создавал ещё [3,4,5] из SDP.

**Решение**: Создавать transceivers **только для offerer**, для answerer они создаются автоматически из remote SDP:

```typescript
function createPeerConnection(peerId: string, isOfferer: boolean = false) {
  const pc = new RTCPeerConnection({ iceServers });
  
  if (isOfferer) {
    // Создаём transceivers в фиксированном порядке
    const ta = pc.addTransceiver('audio', { direction: 'sendrecv' });
    const tv1 = pc.addTransceiver('video', { direction: 'sendrecv' }); // Camera
    const tv2 = pc.addTransceiver('video', { direction: 'sendrecv' }); // Screen
    peerSenders[peerId] = { audio: ta.sender, v1: tv1.sender, v2: tv2.sender };
  } else {
    // Для answerer transceivers создадутся из remote SDP
    // После setRemoteDescription сохраняем senders из transceivers
  }
  
  peers[peerId] = pc;
  return pc;
}
```

Вызов:
```typescript
// Existing user creates offer for new user
createPeerConnection(peerId, true); // isOfferer = true

// New user receives offer
createPeerConnection(peerId, false); // isOfferer = false, transceivers from SDP
```

Затем треки назначаются в строгом порядке:

```typescript
function assignLocalTracksToPeer(peerId: string, pc: RTCPeerConnection) {
  const senders = peerSenders[peerId] || {};
  
  // Слот 0: audio
  await senders.audio?.replaceTrack(audioTrack || null);
  // Слот 1: camera video
  await senders.v1?.replaceTrack(cameraTrack || null);
  // Слот 2: screen video
  await senders.v2?.replaceTrack(screenTrack || null);
}
```

### 5. Event Flow

#### Existing User присоединяется к комнате с новым User

**Existing User (A):**
1. Уже в комнате, `localStream` активен (camera on)
2. Получает `socket.on('userJoined', B)`
3. Создаёт `RTCPeerConnection` для B
4. Вызывает `makeOffer(B)`:
   - `assignLocalTracksToPeer(B)` → camera track в слот 1
   - `createOffer()` → SDP содержит 3 m-lines: audio, video (camera), video (screen=null)
   - `socket.emit('offer', { to: B, offer })`

**New User (B):**
1. Входит в комнату
2. Получает `socket.on('existingUsers', [A])`
3. Создаёт `RTCPeerConnection` для A
4. **НЕ вызывает makeOffer**, т.к. A уже отправил offer
5. Получает `socket.on('offer', { from: A, offer })`
6. `pc.setRemoteDescription(offer)` → создаёт receivers для треков A
7. `pc.createAnswer()` → SDP ответ с 3 m-lines
8. `socket.emit('answer', { to: A, answer })`
9. `pc.ontrack` → получает camera track от A → отображает в плитке A

**Existing User (A):**
1. Получает `socket.on('answer', { from: B, answer })`
2. `pc.setRemoteDescription(answer)` → завершает negotiation
3. ICE candidates обмениваются → `iceConnectionState: connected`

#### User включает camera во время звонка

1. `setCameraEnabled(true)`
2. `cameraStream = await getUserMedia({ video: true })`
3. `markTrackSource(cameraTrack, 'camera')`
4. `rebuildLocalStream()` → добавляет camera track в `localStream`
5. Для каждого peer:
   - `makeOffer(peerId)` → renegotiation с новым треком
6. Удалённый peer получает `ontrack(cameraTrack)`
7. `handleRemoteTrack()` → идентифицирует как camera → отображает в плитке

## Debugging

### Console Logs
Все логи помечены префиксом `[CALL]`:
- `[CALL] joined room {roomId}` - вход в комнату
- `[CALL] camera toggle {true/false}` - переключение камеры
- `[CALL] marked track {kind} as {source}` - маркировка трека
- `[CALL] rebuilding localStream` - пересборка локального потока
- `[CALL] created transceivers for {peerId} (offerer)` - создали transceivers как offerer
- `[CALL] skipped transceivers for {peerId} (answerer, will use remote SDP)` - пропустили, будем answerer
- `[CALL] saved senders from remote SDP for {peerId}` - сохранили senders из remote SDP после setRemoteDescription
- `[CALL] track from {peerId} mapped by transceiver[{index}] -> {source}` - трек определён по индексу transceiver
- `[CALL] received track from {peerId}: {kind} [{source}]` - получен трек от пира
- `[CALL] sent offer to {peerId}` - отправили offer
- `[CALL] sent answer to {peerId}` - отправили answer
- `[CALL] received answer from {peerId}` - получили answer
- `[CALL] skip offer for {peerId} (already making offer)` - пропущен offer (уже создаём offer)
- `[CALL] skip offer for {peerId} (state: {state})` - пропущен offer (не в stable state)
- `[CALL] ignoring offer from {peerId} (collision, we are impolite)` - игнорируем offer из-за collision
- `[CALL] renegotiate error for {peerId}` - ошибка renegotiation

### Типичные ошибки

#### `Called in wrong state: stable`
**Причина**: Попытка `setRemoteDescription(answer)` когда peer уже в stable state (concurrent offers).
**Решение**: Использовать `_makingOffer` флаг и проверять `signalingState` перед созданием offer.

#### `The order of m-lines doesn't match`
**Причина**: Порядок transceivers изменился между offer и answer.
**Решение**: Создавать transceivers сразу при `createPeerConnection()` в фиксированном порядке.

#### `Black screen` при входе нового участника
**Причина**: Track приходит как `muted: true` или `_source: unknown` и не отображается.
**Решение**: 
- Проверить, что `markTrackSource()` вызывается для всех треков
- Проверить, что `assignLocalTracksToPeer()` вызывается перед `createOffer()`
- Убедиться, что `track.onunmute` срабатывает и видео не скрыто

#### Плитка не удаляется при выходе
**Причина**: `socket.on('userLeft')` не срабатывает.
**Решение**: При выходе вызывать `socket.emit('leaveRoom', roomId)` **перед** `socket.disconnect()`.

## TURN Server

**Адрес**: `turn:nit.nicorp.tech:3478`
**Credentials**: `test:test`
**Порты**:
- 3478 (UDP/TCP) - основной TURN порт
- 49160-49200 (UDP/TCP) - relay порты

**Конфигурация**:
```javascript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:nit.nicorp.tech:3478', username: 'test', credential: 'test' },
  { urls: 'turn:nit.nicorp.tech:3478?transport=tcp', username: 'test', credential: 'test' }
];
```

## Nginx Configuration

```nginx
location /socket.io/ {
    proxy_pass http://signaling:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## TODO

- [ ] Добавить pagination для участников (стрелки влево/вправо)
- [ ] Поддержка viewer mode (вход без устройств)
- [ ] Persistence вызовов через backend API (уже реализовано на `newbackend`)
- [ ] Интеграция с проектами (привязка звонка к project_id)
