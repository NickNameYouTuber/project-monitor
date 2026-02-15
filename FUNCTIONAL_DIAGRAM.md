# Функциональная схема серверных приложений

Ниже представлены функциональные схемы в виде иерархии: **приложение → блоки ролей → зависимые функции**. Схемы нарисованы кодом (Mermaid) и могут быть отображены в любом редакторе с поддержкой Mermaid (GitHub, GitLab, VS Code с расширением и т.д.).

---

## 1. Project Monitor Backend (основное серверное приложение)

Компактная схема: приложение → роли → функции; стрелками показаны иерархия и связи между ролями (например, запуск pipeline и просмотр логов связаны с Runner).

```mermaid
flowchart TB
  APP["Project Monitor Backend"]

  APP --> R_GUEST["Гость"]
  APP --> R_USER["Пользователь"]
  APP --> R_RUNNER["Runner"]
  APP --> R_GIT["Git-клиент"]
  APP --> R_WS["WebSocket-клиент"]

  R_GUEST --> F_REG["Регистрация, вход логин/пароль"]
  F_REG --> F_TG["Вход через Telegram"]
  F_TG --> F_SSO["SSO: инициация и callback"]

  R_USER --> F_ME["Профиль, токены PAT"]
  F_ME --> F_DASH["Дашборды и участники"]
  F_DASH --> F_PROJ["Проекты, колонки, задачи, комментарии"]
  F_PROJ --> F_REPO["Репозитории, MR, доски"]
  F_REPO --> F_PIPE["Pipelines/Jobs, орг., звонки, чат/AI"]
  F_PIPE -->|запуск, логи| R_RUNNER
  F_REPO -->|fetch, push| R_GIT

  R_RUNNER --> F_LEASE["Lease задания"]
  F_LEASE --> F_LOGS["Логи и статус job"]
  F_LOGS --> F_SSE["SSE поток логов"]

  R_GIT --> F_HTTP["Git over HTTP"]

  R_WS --> F_RT["Realtime-события"]
  F_RT --> F_PL["Логи pipeline"]
  F_PL -->|стриминг| R_RUNNER
  F_RT --> F_CALL["Уведомления о звонках"]
```

---

## 2. MediaSoup SFU Server (сервис видеозвонков)

Компактная схема с вертикальными цепочками функций и связью участника с сервером (медиа идёт через SFU).

```mermaid
flowchart TB
  APP2["MediaSoup SFU Server"]

  APP2 --> R_PART["Участник звонка"]
  APP2 --> R_SRV["Сервер"]

  R_PART --> F_CONN["Подключение к SFU, WebRTC"]
  F_CONN --> F_MEDIA["Отправка/получение медиа, simulcast"]
  F_MEDIA -->|RTP-потоки| R_SRV

  R_SRV --> F_REDIS["Redis, масштабирование"]
  F_REDIS --> F_RTP["Маршрутизация RTP, STUN/TURN"]
  F_RTP --> F_SHD["Shutdown, очистка"]
```

---

## Текстовая иерархия (для вставки в документ/слайд)

### Project Monitor Backend

| Уровень | Элемент |
|--------|--------|
| **Приложение** | Project Monitor Backend |
| **Роль** | Гость / Неаутентифицированный |
| ↳ Функции | Регистрация; Вход (логин/пароль); Вход через Telegram; SSO |
| **Роль** | Пользователь |
| ↳ Функции | Профиль; Токены; Дашборды и участники; Проекты; Колонки и задачи; Комментарии; Привязка веток; Репозитории и участники; MR и обсуждения; Whiteboards; Pipelines и Jobs; Организации, участники и роли; Звонки; Чат и AI |
| **Роль** | Runner |
| ↳ Функции | Lease; Отправка логов/статуса job; SSE поток логов |
| **Роль** | Git-клиент |
| ↳ Функции | Git over HTTP |
| **Роль** | Клиент WebSocket |
| ↳ Функции | Realtime; Логи pipeline; Уведомления о звонках |

### MediaSoup SFU Server

| Уровень | Элемент |
|--------|--------|
| **Приложение** | MediaSoup SFU Server |
| **Роль** | Участник звонка |
| ↳ Функции | Подключение к SFU; Отправка/получение медиа; Simulcast; Отключение |
| **Роль** | Сервер (внутренние) |
| ↳ Функции | Redis; Маршрутизация RTP; STUN/TURN; Shutdown |

---

## Как отобразить Mermaid-схемы

- **GitHub / GitLab**: вставьте блок кода с `mermaid` в `.md` файл — диаграмма отрисуется в предпросмотре.
- **VS Code**: установите расширение "Markdown Preview Mermaid Support" и откройте предпросмотр (Ctrl+Shift+V).
- **Онлайн**: скопируйте код в [mermaid.live](https://mermaid.live) и экспортируйте в PNG/SVG для слайда.

При необходимости можно упростить схему (меньше функций в блоках) или разбить «Пользователь» на подроли (Owner, Admin, Member, Guest организации и OWNER, ADMIN, DEVELOPER, VIEWER проекта).
