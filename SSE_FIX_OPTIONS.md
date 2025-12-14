# Варианты исправления SSE для realtime обновлений

## Проблема
События отправляются с бэкенда (видно в логах), но не доходят до фронтенда. На фронтенде приходят только heartbeat события.

## ✅ РЕАЛИЗОВАНО: Вариант 1 - @microsoft/fetch-event-source
**Описание**: Использовать библиотеку `@microsoft/fetch-event-source`, которая специально разработана для работы с SSE через fetch API и правильно обрабатывает все форматы событий.

**Преимущества**:
- Поддержка кастомных заголовков (Authorization)
- Правильный парсинг всех форматов SSE
- Автоматическая обработка событий
- Хорошая обработка ошибок
- Поддержка переподключения

**Реализовано в**: `front/src/services/sseService.ts`

## Вариант 2: Использовать EventSource API (если библиотека не поможет)
**Описание**: Использовать нативный браузерный EventSource API, который специально разработан для SSE.

**Преимущества**:
- Нативная поддержка SSE в браузерах
- Автоматический парсинг событий
- Автоматическое переподключение

**Недостатки**:
- Нет поддержки кастомных заголовков (нужно передавать токен через query параметры)

**Реализация**:
```typescript
const eventSource = new EventSource(
  `/api/realtime/stream?organizationId=${organizationId}&token=${token}`
);

eventSource.addEventListener('project-created', (event) => {
  const data = JSON.parse(event.data);
  handlers.onProjectCreated?.(data);
});
```

## Вариант 3: Исправить формат отправки на бэкенде (явная сериализация)
**Описание**: Явно сериализовать данные в JSON строку перед отправкой через SseEmitter.

**Реализация**:
```java
String jsonData = objectMapper.writeValueAsString(data);
emitter.send(SseEmitter.event()
    .name(eventType)
    .data(jsonData));
```

## Вариант 4: Использовать WebSocket вместо SSE
**Описание**: Заменить SSE на WebSocket для двусторонней связи в реальном времени.

**Преимущества**:
- Двусторонняя связь
- Более надежная доставка сообщений
- Лучшая производительность

**Недостатки**:
- Более сложная реализация
- Нужно переделать бэкенд

## Вариант 5: Использовать eventsource-polyfill
**Описание**: Использовать полифилл для EventSource с поддержкой заголовков.

**Реализация**:
```typescript
import { EventSourcePolyfill } from 'eventsource-polyfill';

const eventSource = new EventSourcePolyfill(
  `/api/realtime/stream?organizationId=${organizationId}`,
  {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
);
```

## Текущий статус
✅ **Реализован Вариант 1** - используется `@microsoft/fetch-event-source` для правильной обработки SSE событий.

**Следующие шаги**:
1. Установить зависимость: `npm install @microsoft/fetch-event-source`
2. Пересобрать фронтенд
3. Протестировать создание проекта через ИИ

Если это не поможет, можно попробовать Вариант 2 (EventSource API) или Вариант 3 (явная сериализация на бэкенде).
