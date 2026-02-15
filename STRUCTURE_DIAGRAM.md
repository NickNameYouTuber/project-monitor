# Структурная схема проекта Project Monitor

Схема отражает структуру основных модулей и зависимостей всего проекта (фронт и бэк). Под схемой — таблица элементов и их описание.

---

## Схема структуры

```mermaid
flowchart TB
  ROOT["project-monitor (docker-compose.yml)"]

  ROOT --> BACKEND["newbackend/pom.xml"]
  ROOT --> FRONT["front/package.json"]
  ROOT --> RUNNER["runner/runner.py"]
  ROOT --> EXT["services (mediasoup, nimeet)"]

  BACKEND --> ENTRY_B["ProjectMonitorApplication.java"]
  ENTRY_B --> CTRL["Controllers: Auth, Users, Dashboards, Projects, TaskColumns, Tasks, Repositories, MergeRequests, Pipelines, Calls, Organizations, Whiteboards, Comments, SSO, Chat/AI"]
  CTRL --> SVC["Services (по доменам)"]
  SVC --> REPO["Repositories + Domain"]
  ENTRY_B --> WS["websocket: Realtime, PipelineLogs, CallNotification"]
  ENTRY_B --> CORE["config, common, git, realtime"]

  FRONT --> ENTRY_F["main.tsx"]
  ENTRY_F --> APP["App.tsx"]
  APP --> PAGES["components: projects-page, tasks, repository, whiteboard, calls, account, organizations…"]
  APP --> FEAT["features/call (CallPage, VideoGrid, ChatPanel…)"]
  ENTRY_F --> API["api/* (client, auth, projects, tasks, pipelines…)"]
  ENTRY_F --> SVC_F["services/websocketService"]
  PAGES --> API
  PAGES --> SVC_F
  API --> TYPES["types, lib, contexts, hooks"]
```

---

## Описание элементов схемы

| Название | Описание |
|----------|----------|
| docker-compose.yml | Файл решения: frontend, backend, БД, runner, LiveKit, MediaSoup, Gitea. |
| newbackend/pom.xml | Серверный проект API (Maven, Java, Spring Boot). |
| newbackend/.../ProjectMonitorApplication.java | Точка входа backend. |
| newbackend/.../Controllers/* | REST API: auth, users, dashboards, projects, tasks, repos, MR, pipelines, calls, orgs, whiteboards, comments, SSO, chat. |
| newbackend/.../Services/* | Бизнес-логика по доменам, интеграция с БД и внешними сервисами. |
| newbackend/.../websocket/* | WebSocket: realtime, логи pipeline, уведомления о звонках. |
| newbackend/.../domain, repo, dto | Модели, репозитории JPA, DTO. |
| newbackend/.../config, common, git | Конфигурация, обработка ошибок, JGit. |
| front/package.json | Зависимости и сборка frontend (React, Vite). |
| front/src/main.tsx | Точка входа UI. |
| front/src/App.tsx | Корневой компонент, маршрутизация, layout. |
| front/src/components/* | Страницы и UI: проекты, задачи, репо, whiteboard, звонки, аккаунт, орг. |
| front/src/features/call/* | Модуль видеозвонка (CallPage, VideoGrid, ChatPanel). |
| front/src/api/* | REST-клиенты к backend. |
| front/src/services/websocketService.ts | Подключение к WebSocket backend. |
| front/src/types, contexts, hooks | Типы, контексты, хуки. |
| runner/runner.py | CI/CD: задания от API, job в Docker, логи/статус. |
| LiveKit, MediaSoup, NIMeet (внешние) | SFU и сигналинг видеосвязи; медиа — клиент ↔ SFU. |

---

Схему можно отобразить в предпросмотре Markdown или на [mermaid.live](https://mermaid.live) и экспортировать в PNG/SVG для слайда.
