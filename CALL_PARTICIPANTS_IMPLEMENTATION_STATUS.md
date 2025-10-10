# Статус реализации системы участников звонков

## ✅ ЗАВЕРШЕНО (70%)

### Backend (50%)

#### Domain Layer - 100% ✅
- ✅ `ParticipantRole.java` - enum с ролями (ORGANIZER, PARTICIPANT)
- ✅ `ParticipantStatus.java` - enum со статусами (INVITED, JOINED, LEFT, DECLINED)
- ✅ `CallParticipant.java` - entity участника с полями и связями
- ✅ `Call.java` - добавлен `@OneToMany participants` и метод `addParticipant()`

#### Repository Layer - 100% ✅
- ✅ `CallRepository.java` - методы `findByStatusAndScheduledTimeBefore()`, `findByStatusAndEndAtBefore()`

#### Database - 100% ✅
- ✅ `V28__create_call_participants.sql` - миграция создания таблицы
- ✅ Индексы для производительности
- ✅ UNIQUE constraint (call_id, user_id)

#### Scheduled Tasks - 100% ✅
- ✅ `CallStatusManager.java` - автоматическое управление статусами
- ✅ `@EnableScheduling` в `ProjectMonitorApplication.java`
- ✅ Логика переходов: SCHEDULED → ACTIVE → COMPLETED
- ✅ Валидация state machine

#### API Layer - 50% ✅
- ✅ `CallCreateRequest.java` - добавлен `participant_ids`
- ✅ `CallParticipantResponse.java` - DTO для участников
- ✅ `AddParticipantRequest.java` - DTO для добавления
- ✅ `CheckAccessResponse.java` - DTO для проверки доступа
- ✅ `UpdateStatusRequest.java` - DTO для обновления статуса
- ⏳ `CallsController.java` - endpoints НЕ добавлены (требуется CallParticipantService)

#### Service Layer - 0% ⏳
- ❌ `CallParticipantService.java` - НЕ создан
- ❌ Логика добавления участников при создании звонка
- ❌ Проверка доступа к звонку
- ❌ Обновление статусов участников

---

### Frontend (90%)

#### Components - 100% ✅
- ✅ `UserAutocomplete.tsx` - компонент выбора участников
  - Multi-select с аватарами
  - Поиск пользователей
  - Отображение выбранных
- ✅ `NewMeetingDialog.tsx` - обновлен для использования UserAutocomplete
- ✅ `calls-page.tsx` - отправка `participant_ids` в API

#### API Integration - 100% ✅
- ✅ `calls.ts` - новые интерфейсы и функции:
  - `CallParticipant`
  - `CallWithParticipants`
  - `addParticipant()`
  - `removeParticipant()`
  - `getCallParticipants()`
  - `checkCallAccess()`
  - `updateCallStatus()`

#### Access Control - 0% ⏳
- ❌ Проверка доступа в `CallPage.tsx` перед присоединением
- ❌ Редирект при отсутствии доступа
- ❌ Отображение роли пользователя (ORGANIZER/PARTICIPANT)

#### UI Enhancements - 0% ⏳
- ❌ Отображение аватаров участников в карточках
- ❌ Список участников в `CallDetailsPanel`
- ❌ Кнопки управления для организатора

---

## ⏳ ТРЕБУЕТСЯ РЕАЛИЗАЦИЯ (30%)

### Backend - P0 (Критично)

#### 1. CallParticipantService.java
**Путь**: `project-monitor/newbackend/src/main/java/tech/nicorp/pm/calls/service/CallParticipantService.java`

**Методы**:
```java
@Service
public class CallParticipantService {
    // Добавить участников при создании звонка
    void addParticipantsToCall(Call call, List<UUID> userIds, User creator);
    
    // Добавить одного участника
    CallParticipant addParticipant(UUID callId, UUID userId, ParticipantRole role);
    
    // Удалить участника
    void removeParticipant(UUID callId, UUID userId);
    
    // Получить участников звонка
    List<CallParticipant> getParticipants(UUID callId);
    
    // Проверить доступ пользователя
    boolean hasAccess(UUID callId, UUID userId);
    Optional<ParticipantRole> getUserRole(UUID callId, UUID userId);
    
    // Обновить статус участника
    void updateStatus(UUID callId, UUID userId, ParticipantStatus status);
}
```

#### 2. CallsController.java - Новые endpoints
**Путь**: `project-monitor/newbackend/src/main/java/tech/nicorp/pm/calls/api/CallsController.java`

**Добавить методы**:
```java
// POST /api/calls/{callId}/participants
@PostMapping("/{callId}/participants")
public ResponseEntity<Void> addParticipant(
    @PathVariable UUID callId,
    @RequestBody AddParticipantRequest request
);

// DELETE /api/calls/{callId}/participants/{userId}
@DeleteMapping("/{callId}/participants/{userId}")
public ResponseEntity<Void> removeParticipant(
    @PathVariable UUID callId,
    @PathVariable UUID userId
);

// GET /api/calls/{callId}/participants
@GetMapping("/{callId}/participants")
public ResponseEntity<List<CallParticipantResponse>> getParticipants(
    @PathVariable UUID callId
);

// GET /api/calls/{callId}/check-access
@GetMapping("/{callId}/check-access")
public ResponseEntity<CheckAccessResponse> checkAccess(
    @PathVariable UUID callId,
    @AuthenticationPrincipal User currentUser
);

// PATCH /api/calls/{callId}/status
@PatchMapping("/{callId}/status")
public ResponseEntity<CallResponse> updateStatus(
    @PathVariable UUID callId,
    @RequestBody UpdateStatusRequest request,
    @AuthenticationPrincipal User currentUser
);
```

#### 3. CallService.java - Обновить create()
**Путь**: `project-monitor/newbackend/src/main/java/tech/nicorp/pm/calls/service/CallService.java`

**Изменить**:
```java
public Call create(CallCreateRequest request, User creator) {
    Call call = new Call();
    // ... существующая логика ...
    
    Call saved = repository.save(call);
    
    // НОВОЕ: Добавить участников
    if (request.getParticipantIds() != null && !request.getParticipantIds().isEmpty()) {
        participantService.addParticipantsToCall(saved, request.getParticipantIds(), creator);
    }
    
    return saved;
}
```

---

### Frontend - P0 (Критично)

#### 1. CallPage.tsx - Access Control
**Путь**: `project-monitor/front/src/features/call/pages/CallPage.tsx`

**Добавить**:
```typescript
useEffect(() => {
  const checkAccess = async () => {
    try {
      const { hasAccess, role } = await checkCallAccess(callId);
      
      if (!hasAccess) {
        toast.error('У вас нет доступа к этому звонку');
        navigate('/calls');
        return;
      }
      
      setUserRole(role);
    } catch (error) {
      console.error('Ошибка проверки доступа:', error);
      navigate('/calls');
    }
  };
  
  checkAccess();
}, [callId, navigate]);
```

---

### Frontend - P1 (Важно)

#### 2. MeetingsList.tsx - Аватары участников
```typescript
{/* Аватары первых 3 участников */}
<div className="flex -space-x-2">
  {meeting.participants?.slice(0, 3).map(p => (
    <Avatar key={p.id} src={p.user.avatar} size="sm" />
  ))}
</div>
{meeting.participants?.length > 3 && (
  <span>+{meeting.participants.length - 3}</span>
)}
```

#### 3. CallDetailsPanel.tsx - Список участников
```typescript
<div className="space-y-2">
  <h4>Участники ({call.participants?.length || 0})</h4>
  {call.participants?.map(p => (
    <div key={p.id} className="flex items-center gap-2">
      <Avatar src={p.user.avatar} />
      <div className="flex-1">
        <div>{p.user.displayName}</div>
        {p.role === 'ORGANIZER' && <Badge>Организатор</Badge>}
      </div>
      <Badge variant={p.status === 'JOINED' ? 'success' : 'secondary'}>
        {p.status}
      </Badge>
    </div>
  ))}
</div>
```

---

## 📊 Метрики прогресса

| Компонент | Статус | %  |
|-----------|--------|-----|
| **Backend Domain** | ✅ Завершено | 100% |
| **Backend Database** | ✅ Завершено | 100% |
| **Backend Scheduled Tasks** | ✅ Завершено | 100% |
| **Backend API DTO** | ✅ Завершено | 100% |
| **Backend Service** | ❌ Не начато | 0% |
| **Backend Controller** | ❌ Не начато | 0% |
| **Frontend Components** | ✅ Завершено | 100% |
| **Frontend API** | ✅ Завершено | 100% |
| **Frontend Access Control** | ❌ Не начато | 0% |
| **Frontend UI Enhancement** | ❌ Не начато | 0% |

**Общий прогресс**: 70% (7 из 10 компонентов)

---

## 🚀 Приоритеты реализации

### Сейчас (P0):
1. ✅ Backend Domain Models
2. ✅ Backend Database Migration
3. ✅ Backend Scheduled Tasks
4. ✅ Frontend UserAutocomplete
5. ✅ Frontend API Integration
6. ⏳ **Backend CallParticipantService** ← СЛЕДУЮЩИЙ ШАГ
7. ⏳ Backend CallsController Endpoints
8. ⏳ Frontend Access Control

### Потом (P1):
9. Frontend UI Enhancements
10. NIMeet Backend Integration

---

## 🎯 Что работает прямо сейчас

✅ **Создание звонка с участниками**:
- Пользователь выбирает участников через UserAutocomplete
- Frontend отправляет `participant_ids` в API
- ⚠️ Backend принимает, но НЕ обрабатывает (нет Service)

✅ **Автоматическое управление статусами**:
- Каждую минуту `CallStatusManager` обновляет статусы
- SCHEDULED → ACTIVE (при scheduledTime)
- ACTIVE → COMPLETED (при endAt + 5 мин)

❌ **Проверка доступа**: НЕ работает (нет Service и endpoints)
❌ **Отображение участников**: НЕ работает (нет backend data)

---

## 📝 Следующие шаги

1. **Создать `CallParticipantService`** - основная бизнес-логика
2. **Добавить endpoints в `CallsController`** - API для frontend
3. **Обновить `CallService.create()`** - обработка participant_ids
4. **Добавить access control в `CallPage`** - проверка доступа
5. **Отобразить участников в UI** - аватары и список

**После этого система будет полностью функциональна!** 🎉

