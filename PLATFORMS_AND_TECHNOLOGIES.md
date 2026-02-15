# Платформы и технологии в решении

---

## Платформы и технологии в решении

| Вид приложения | Платформа / версия | Технологии | Библиотеки | Обоснование |
|----------------|--------------------|------------|------------|-------------|
| Web-приложение | Node 20, Nginx Alpine | React, TypeScript, SPA, Vite, WebRTC, чат/AI | React 18, Vite 6, Tailwind, NUI, livekit-client, mediasoup-client, @google/genai, react-markdown, socket.io-client | UI, типизация, видеозвонки (LiveKit/MediaSoup), чат с LLM, Markdown |
| Серверное (API) | Java 21, Spring Boot 3.3 | REST, WebSocket, JPA | Spring Web/Security/Data JPA/WebSocket, Flyway, PostgreSQL, JJWT, JGit, SpringDoc OpenAPI, LiveKit SDK | Бизнес-логика, JWT, миграции БД, Git over HTTP, OpenAPI |
| Серверное (SFU, NIMeet) | Node 20 | WebRTC SFU, сигналинг | mediasoup 3.14, Express, Socket.IO, Redis, Mongoose, MongoDB | Медиа (SFU), комнаты/сессии, масштабирование через Redis |
| Служба (CI/CD раннер) | Python 3.11 | HTTP, Docker | requests, docker | Задания от API, выполнение job в контейнерах, логи/статус |
| БД и инфраструктура | PostgreSQL 15, MongoDB 7, Redis 7, LiveKit, Coturn 4.6, Gitea 1.21, Docker Compose, Nginx | СУБД, кэш, WebRTC, TURN, Git, контейнеры | — | Хранение данных, сессии, видеозвонки, обход NAT, репозитории, развёртывание |
