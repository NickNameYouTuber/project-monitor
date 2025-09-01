# Project Monitor Java Backend

Spring Boot replacement for the Python FastAPI backend. Work-in-progress; currently includes CI/CD pipelines minimal implementation and stubs for repositories, repository content, merge requests, and tasks.

## Build

```bash
mvn -f newbackend/pom.xml -DskipTests package
```

Artifact: `newbackend/target/project-monitor-backend-0.1.0.jar`

## Run (local)

```bash
java -jar newbackend/target/project-monitor-backend-0.1.0.jar \
  --spring.datasource.url=jdbc:postgresql://localhost:5432/project_monitor \
  --spring.datasource.username=postgres \
  --spring.datasource.password=postgres
```

Listens on `:8081` by default.

## Docker

```bash
docker build -t pm-java:newbackend -f newbackend/Dockerfile .
```

Run:

```bash
docker run --rm -p 8081:8081 \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/project_monitor \
  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
  pm-java:newbackend
```

## Endpoints (WIP)
- POST /api/pipelines/trigger — create pipeline (stub rules)
- POST /api/pipelines/{id}/cancel — cancel pipeline
- POST /api/pipelines/runners/lease — lease next job
- POST /api/pipelines/runners/jobs/{jobId}/logs — append log chunk
- POST /api/pipelines/runners/jobs/{jobId}/status — update job status
- GET /api/pipelines/jobs/{jobId}/logs — aggregated logs
- POST /api/pipelines/jobs/{jobId}/start — release manual job

Repo/MR/Tasks endpoints are stubbed (501) for now.

## Database migrations
Flyway runs automatically. Migrations:
- V1__init_pipelines.sql
- V2__pipeline_logs.sql

## Next steps
- Port Git operations (JGit) and MR logic
- Implement CI rules parsing/evaluation in Java
- JWT auth compatible with existing frontend


