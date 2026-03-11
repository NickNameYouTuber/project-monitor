# Матрица покрытия

| Ручной кейс | Модуль | Endpoint / логика | Автоматическое покрытие |
|---|---|---|---|
| TC-001 | Organizations | `POST /api/organizations` | `OrganizationsControllerApiTest.createReturnsCreatedAndUsesGeneratedSlug()` |
| TC-002 | Organizations | генерация slug в `OrganizationsController.create()` | `OrganizationsControllerApiTest.createReturnsCreatedAndUsesGeneratedSlug()` |
| TC-003 | Organizations | `GET /api/organizations` | `OrganizationsControllerApiTest.listReturnsCurrentUserOrganizations()` |
| TC-004 | Organizations | `GET /api/organizations` без авторизации | `OrganizationsControllerApiTest.listReturnsUnauthorizedWithoutAuthentication()` |
| TC-005 | Organizations | `GET /api/organizations/{id}` | запланировано на следующую итерацию |
| TC-006 | Organizations | проверка доступа через `OrganizationMemberService.hasAccess()` | запланировано на следующую итерацию |
| TC-007 | Organizations | `POST /api/organizations/{id}/verify-password` | запланировано на следующую итерацию |
| TC-008 | Organizations | валидация verify-password | запланировано на следующую итерацию |
| TC-009 | Projects | `POST /api/projects` | `ProjectsControllerApiTest.createReturnsCreatedAndAddsOwnerMembership()` |
| TC-010 | Projects | `GET /api/projects?organizationId=...` | `ProjectsControllerApiTest.listReturnsOnlyProjectsForSelectedOrganization()` |
| TC-011 | Projects | проверка членства в `ProjectsController.list()` | `ProjectsControllerApiTest.listReturnsForbiddenWhenUserIsNotOrganizationMember()` |
| TC-012 | Projects | `PUT /api/projects/{id}` | запланировано на следующую итерацию |
| TC-013 | Projects | проверка ролей через `ProjectMemberService.canEditProject()` | запланировано на следующую итерацию |
| TC-014 | Projects | `POST /api/projects/reorder` | запланировано на следующую итерацию |
| TC-015 | Projects | невалидный UUID в reorder | запланировано на следующую итерацию |
| TC-016 | Tasks | `GET /api/projects/{projectId}/tasks` | `TasksControllerApiTest.listTasksReturnsOrderedTasksForAuthorizedUser()` |
| TC-017 | Tasks | проверка верификации в `TasksController.checkAccess()` | `TasksControllerApiTest.listTasksReturnsForbiddenWhenOrganizationVerificationIsMissing()` |
| TC-018 | Tasks | `POST /api/projects/{projectId}/tasks` | `TasksControllerApiTest.createTaskReturnsCreatedWhenAccessIsGranted()` |
| TC-019 | Tasks | создание задачи при отсутствии колонки | запланировано на следующую итерацию |
| TC-020 | Tasks | `PUT /api/projects/{projectId}/tasks/{taskId}/move` | запланировано на следующую итерацию |

## Покрытие unit-тестами

| Цель unit-теста | Важное поведение | Автоматическое покрытие |
|---|---|---|
| `PipelineYamlParser` | разбор defaults, variables, script и rules | `PipelineYamlParserTest` |
| `CallStatusManager` | разрешенные переходы статусов и отклонение недопустимого перехода | `CallStatusManagerTest` |

## Примечания по приоритетам
- Первая итерация автоматизации сосредоточена на высокорисковых проверках доступа и ключевых CRUD-сценариях.
- Остальные кейсы высокого приоритета уже задокументированы и могут быть добавлены поэтапно без изменения структуры папки tests.
