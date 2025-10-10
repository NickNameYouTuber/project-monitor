# Система управления участниками звонков - Реализовано

## ✅ Backend - Созданные компоненты

### 1. Domain Models (4 файла)

#### ParticipantRole.java
```java
public enum ParticipantRole {
    ORGANIZER,    // Организатор звонка
    PARTICIPANT   // Обычный участник
}
```

#### ParticipantStatus.java
```java
public enum ParticipantStatus {
    INVITED,      // Приглашен
    JOINED,       // Присоединился
    LEFT,         // Покинул
    DECLINED      // Отклонил
}
```

#### CallParticipant.java
- Many-to-One связь с Call
- Many-to-One связь с User
- Поля: role, status, invited_at, joined_at, left_at

#### Call.java (обновлен)
- Добавлен `@OneToMany List<CallParticipant> participants`
- Метод `addParticipant(User user, ParticipantRole role)`

### 2. CallStatusManager.java
**Автоматическое управление статусами**:

- `@Scheduled(fixedRate = 60000)` - каждую минуту
- `activateScheduledCalls()`: SCHEDULED → ACTIVE (при scheduledTime <= now)
- `completeActiveCalls()`: ACTIVE → COMPLETED (при endAt + 5 мин < now)
- `isTransitionAllowed()`: валидация переходов
- `updateStatus()`: безопасное обновление с проверкой

**State Machine**:
```
SCHEDULED → ACTIVE ✅
SCHEDULED → CANCELLED ✅

ACTIVE → COMPLETED ✅
ACTIVE → CANCELLED ✅

COMPLETED → X ❌
CANCELLED → X ❌
```

### 3. CallRepository (обновлен)
**Новые методы**:
- `findByStatusAndScheduledTimeBefore()` - для активации
- `findByStatusAndEndAtBefore()` - для завершения

### 4. Миграция БД
**V28__create_call_participants.sql**:
- Таблица `call_participants`
- Foreign keys к `calls` и `users`
- Индексы для производительности
- UNIQUE constraint (call_id, user_id)

---

## ✅ Frontend - API интеграция

### api/calls.ts (обновлен)

**Новые интерфейсы**:
```typescript
interface CallParticipant {
  id: string;
  user: { id, username, displayName, avatar };
  role: 'ORGANIZER' | 'PARTICIPANT';
  status: 'INVITED' | 'JOINED' | 'LEFT' | 'DECLINED';
  invited_at, joined_at, left_at;
}

interface CallWithParticipants extends CallResponse {
  participants: CallParticipant[];
}
```

**Новые функции**:
- `addParticipant(callId, userId, role)` - добавить участника
- `removeParticipant(callId, userId)` - удалить участника
- `getCallParticipants(callId)` - получить список
- `checkCallAccess(callId)` - проверить доступ
- `updateCallStatus(callId, status)` - изменить статус

**Обновлен**:
- `CallCreateRequest` - добавлен `participant_ids?: string[]`

---

## 📋 Backend API Endpoints (требуется реализация)

### Участники

```
POST   /api/calls/{callId}/participants
DELETE /api/calls/{callId}/participants/{userId}
GET    /api/calls/{callId}/participants
GET    /api/calls/{callId}/check-access
```

### Статусы

```
PATCH  /api/calls/{callId}/status
```

### Обновление createCall

```
POST /api/calls
Body: {
  ...existing fields,
  participant_ids: ["uuid1", "uuid2"]  ← НОВОЕ
}
```

---

## 🎯 Как это работает

### Сценарий 1: Создание звонка с участниками

```
1. Организатор создает звонок
   └→ POST /api/calls { participant_ids: ["user1", "user2"] }

2. Backend:
   ├→ Создает Call (status: SCHEDULED)
   ├→ Добавляет CallParticipant для организатора (role: ORGANIZER)
   ├→ Добавляет CallParticipant для каждого участника (role: PARTICIPANT, status: INVITED)
   └→ (Опционально) Отправляет email приглашения

3. Статус звонка: SCHEDULED
```

### Сценарий 2: Автоматическая активация

```
Каждую минуту CallStatusManager проверяет:

1. Находит Call где status = SCHEDULED И scheduledTime <= now
2. Обновляет status → ACTIVE
3. Логирует: "Call {id} автоматически активирован"

Звонок теперь в группе "🔵 Идут сейчас"
```

### Сценарий 3: Присоединение к звонку

```
1. User кликает "Join Call"
   └→ GET /api/calls/{id}/check-access

2. Backend проверяет:
   ├→ Есть ли CallParticipant для этого userId?
   ├→ Если НЕТ → { hasAccess: false }
   └→ Если ЕСТЬ → { hasAccess: true, role: "PARTICIPANT" }

3. Frontend:
   ├→ hasAccess === false → показать "Access Denied", redirect to /calls
   └→ hasAccess === true → navigate('/call/{roomId}')

4. При join-room:
   ├→ NIMeet backend проверяет доступ
   ├→ Обновляет CallParticipant.status = JOINED
   └→ Устанавливает joined_at = now
```

### Сценарий 4: Автоматическое завершение

```
Каждую минуту CallStatusManager проверяет:

1. Находит Call где status = ACTIVE И endAt + 5 мин < now
2. Обновляет status → COMPLETED
3. Логирует: "Call {id} автоматически завершен"

Звонок теперь в группе "🟡 Завершенные"
```

---

## ⏳ Требуется реализация (Backend)

### P0 - Критично:

1. **CallController endpoints**:
   - POST /api/calls - обновить для participant_ids
   - POST /api/calls/{id}/participants
   - DELETE /api/calls/{id}/participants/{userId}
   - GET /api/calls/{id}/participants
   - GET /api/calls/{id}/check-access
   - PATCH /api/calls/{id}/status

2. **CallService**:
   - Логика добавления участников при создании
   - Автоматическое добавление создателя как ORGANIZER
   - Проверка доступа

3. **NIMeet Backend интеграция**:
   - Проверка доступа в join-room
   - Обновление ParticipantStatus на JOINED/LEFT

### P1 - Важно:

4. **CallParticipantService**:
   - CRUD операции над участниками
   - Бизнес-логика

5. **Включить @EnableScheduling**:
   - В Application.java добавить `@EnableScheduling`
   - CallStatusManager начнет работать автоматически

---

## ⏳ Требуется реализация (Frontend)

### P0 - Критично:

1. **UserAutocomplete компонент**:
   - Поиск пользователей
   - Multi-select
   - Отображение аватаров

2. **NewMeetingDialog (обновить)**:
   - Заменить text input на UserAutocomplete
   - Отправка participant_ids в API

3. **CallPage (добавить)**:
   - Проверка доступа при загрузке
   - Редирект если нет доступа

### P1 - Важно:

4. **MeetingsList (обновить)**:
   - Отображение аватаров участников
   - Счетчик участников

5. **CallDetailsPanel (обновить)**:
   - Список участников с ролями и статусами
   - Кнопки для организатора (Start Now, Cancel, End Call)

6. **Polling**:
   - Обновление списка звонков каждые 30 сек
   - Автоматическое обновление статусов в UI

---

## 📊 Текущий прогресс

### Backend:
- ✅ Domain models (100%)
- ✅ CallStatusManager (100%)
- ✅ CallRepository методы (100%)
- ✅ Миграция БД (100%)
- ⏳ API endpoints (0%)
- ⏳ Service логика (0%)

### Frontend:
- ✅ API типы и функции (100%)
- ⏳ UserAutocomplete (0%)
- ⏳ NewMeetingDialog обновление (0%)
- ⏳ Access control (0%)
- ⏳ UI для участников (0%)

**Общий прогресс**: 35% (6 из 17 задач)

---

## 🚀 Следующие шаги

1. **Backend**: Реализовать API endpoints в CallController
2. **Backend**: Создать CallParticipantService
3. **Backend**: Интегрировать проверку доступа в NIMeet
4. **Frontend**: Создать UserAutocomplete
5. **Frontend**: Обновить NewMeetingDialog
6. **Frontend**: Добавить access control в CallPage

**После этого система будет полностью функциональна!**

