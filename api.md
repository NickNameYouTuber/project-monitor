## API Справочник (новый backend)

Ниже перечислены все доступные HTTP эндпоинты, сгруппированные по доменам. Все пути префиксируются `/api`, если не указано иное. Доступ регулируется в `SecurityConfig`: публично доступны только `/api/auth/**` и Swagger/actuator; остальные требуют аутентификации (JWT либо Basic PAT для git-путей).

### Аутентификация (`/api/auth`)
- POST `/api/auth/register` — регистрация пользователя, ответ: `{ token }`
- POST `/api/auth/login` — вход по логину/паролю, ответ: `{ token }`
- POST `/api/auth/telegram` — вход через Telegram Login Widget, ответ: `{ access_token, token_type, user }`

### Пользователи (`/api/users`)
- GET `/api/users/me` — профиль текущего пользователя
- PUT `/api/users/me` — обновление профиля (username, display_name)
- GET `/api/users` — список пользователей (опц. `?limit=`)

### Токены (`/api/tokens`)
- GET `/api/tokens` — список личных токенов пользователя
- POST `/api/tokens` — создать токен, тело: `{ name }`, ответ: `{ token }`
- DELETE `/api/tokens/{tokenId}` — отозвать токен

### Дашборды (`/api/dashboards`)
- GET `/api/dashboards` — список дашбордов
- GET `/api/dashboards/{id}` — получить дашборд
- POST `/api/dashboards` — создать дашборд
- PUT `/api/dashboards/{id}` — обновить дашборд
- DELETE `/api/dashboards/{id}` — удалить дашборд

#### Участники дашборда (`/api/dashboards/{dashboardId}/members`)
- GET `/api/dashboards/{dashboardId}/members` — список участников
- POST `/api/dashboards/{dashboardId}/members` — добавить участника
- DELETE `/api/dashboards/{dashboardId}/members/{memberId}` — удалить/деактивировать участника

### Проекты (`/api/projects`)
- GET `/api/projects` — список проектов
- GET `/api/projects/{id}` — получить проект
- POST `/api/projects` — создать проект
- PUT `/api/projects/{id}` — обновить проект
- DELETE `/api/projects/{id}` — удалить проект
- PATCH `/api/projects/{id}/status` — обновить статус проекта
- POST `/api/projects/reorder` — изменить порядок проектов

#### Колонки задач проекта (`/api/projects/{projectId}/task-columns`)
- GET `/api/projects/{projectId}/task-columns` — список колонок
- POST `/api/projects/{projectId}/task-columns` — создать колонку
- PUT `/api/projects/{projectId}/task-columns/{columnId}` — обновить колонку
- DELETE `/api/projects/{projectId}/task-columns/{columnId}` — удалить колонку
- PUT `/api/projects/{projectId}/task-columns/reorder` — переупорядочить колонки

#### Задачи проекта (`/api/projects/{projectId}/tasks`)
- GET `/api/projects/{projectId}/tasks` — список задач
- POST `/api/projects/{projectId}/tasks` — создать задачу
- PUT `/api/projects/{projectId}/tasks/{taskId}` — обновить задачу
- PUT `/api/projects/{projectId}/tasks/{taskId}/move` — переместить задачу (сменить колонку/позицию)
- DELETE `/api/projects/{projectId}/tasks/{taskId}` — удалить задачу
- PUT `/api/projects/{projectId}/tasks/column/{columnId}/reorder` — переупорядочить задачи в колонке

### Комментарии (`/api`)
- GET `/api/tasks/{taskId}/comments` — список комментариев задачи
- POST `/api/comments` — создать комментарий

### Интеграция задач и репозитория (`/api/task-repository`)
- GET `/api/task-repository/{taskId}/branches` — ветки, упомянутые в системных комментариях к задаче
- POST `/api/task-repository/{taskId}/attach-branch` — привязать ветку (создаёт системный комментарий)

### Репозитории (`/api/repositories`)
- GET `/api/repositories` — список репозиториев (опц. `?project_id={uuid}`)
- POST `/api/repositories` — создать репозиторий (`{ name, default_branch?, project_id? }`)
- GET `/api/repositories/{repoId}/refs/branches` — список веток
- GET `/api/repositories/{repoId}/refs/tags` — список тегов
- GET `/api/repositories/{repoId}/refs/default` — получить дефолтную ветку `{ default }`

#### Контент репозитория (`/api/repositories/{repoId}`)
- GET `/api/repositories/{repoId}/files?ref=&path?=` — список файлов/папок
- GET `/api/repositories/{repoId}/file?ref=&path=` — содержимое файла (text)
- GET `/api/repositories/{repoId}/commits?ref=` — список коммитов
- GET `/api/repositories/{repoId}/commits/{sha}/diff` — diff для коммита

#### Участники репозитория (`/api/repositories/{repositoryId}/members`)
- GET `/api/repositories/{repositoryId}/members` — список участников
- POST `/api/repositories/{repositoryId}/members` — добавить участника
- DELETE `/api/repositories/{repositoryId}/members/{memberId}` — удалить участника

### Мёрдж-реквесты (`/api/repositories/{repoId}/merge_requests`)
- POST `/api/repositories/{repoId}/merge_requests` — создать MR
- GET `/api/repositories/{repoId}/merge_requests` — список MR
- GET `/api/repositories/{repoId}/merge_requests/{mrId}` — детали MR
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/approve` — аппрув MR
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/unapprove` — снять аппрув
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/merge` — слить MR

#### Обсуждения MR (`/api/repositories/{repoId}/merge_requests/{mrId}/discussions`)
- GET `/api/repositories/{repoId}/merge_requests/{mrId}/discussions` — список обсуждений
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/discussions` — создать обсуждение
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/discussions/{discussionId}/notes` — добавить заметку
- POST `/api/repositories/{repoId}/merge_requests/{mrId}/discussions/{discussionId}/resolve` — пометить обсуждение как решённое

### Whiteboards (`/api/whiteboards` и родственные)
- GET `/api/whiteboards?project_id={uuid}` — получить/создать доску проекта
- GET `/api/whiteboards/{boardId}` — получить доску по id
- POST `/api/whiteboards/{boardId}/elements` — создать элемент
- PATCH `/api/whiteboard-elements/{elementId}` — обновить элемент
- DELETE `/api/whiteboard-elements/{elementId}` — удалить элемент
- POST `/api/whiteboards/{boardId}/connections` — создать связь
- PATCH `/api/whiteboard-connections/{connectionId}` — обновить связь
- DELETE `/api/whiteboard-connections/{connectionId}` — удалить связь

### Pipelines (`/api/pipelines`)
- POST `/api/pipelines/trigger` — запустить pipeline
- POST `/api/pipelines/{pipelineId}/cancel` — отменить pipeline

#### Jobs (`/api/pipelines/jobs`)
- GET `/api/pipelines/jobs/{jobId}/logs` — получить логи job
- POST `/api/pipelines/jobs/{jobId}/start` — вручную стартовать job (release)

#### Runner (`/api/pipelines/runners`)
- POST `/api/pipelines/runners/lease` — раннер запрашивает задание
- POST `/api/pipelines/runners/jobs/{jobId}/logs` — раннер отправляет логи
- POST `/api/pipelines/runners/jobs/{jobId}/status` — раннер отправляет статус
- GET `/api/pipelines/runners/jobs/{jobId}/logs/stream` — SSE поток логов job

### Legacy-совместимость (временно)
- Task Columns (legacy):
  - GET `/api/task-columns/project/{projectId}` — список колонок проекта
  - GET `/api/task-columns/{columnId}` — получить колонку
  - POST `/api/task-columns` — создать колонку
  - PUT `/api/task-columns/{columnId}` — обновить колонку
  - DELETE `/api/task-columns/{columnId}` — удалить колонку
  - PUT `/api/task-columns/reorder/{projectId}` — переупорядочить
  - PUT `/api/task-columns/reorder` — переупорядочить (без projectId)
- Tasks (legacy):
  - GET `/api/tasks/project/{projectId}` — список задач проекта

### Безопасность и доступ
- Публично: `/api/auth/**`, `/actuator/**`, `/swagger-ui/**`, `/api-docs/**`, `/v3/api-docs/**`
- Требует аутентификации: `/api/projects/**`, `/api/dashboards/**`, `/api/repositories/**`, `/api/tasks/**`, `/api/task-repository/**`, `/api/comments/**`, `/api/whiteboards/**`, `/api/whiteboard-**`, `/api/pipelines/**`, `/api/tokens/**`, `/api/users/**`


