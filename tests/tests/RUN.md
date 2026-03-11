# Инструкция по запуску тестов

## Основная команда
Из корня репозитория выполнить:

`mvn -f newbackend/pom.xml test`

## Альтернативная команда
Если Maven не установлен локально, но запущен Docker Desktop, можно использовать:

`docker run --rm -v "${PWD}:/workspace" -w /workspace/newbackend maven:3.9-eclipse-temurin-21 mvn test`

## Что делает команда
- компилирует тестовые классы Java-бэкенда;
- запускает unit-тесты из [newbackend/src/test/java](../../newbackend/src/test/java);
- запускает API/controller-тесты для приоритетных модулей.

## Предварительные условия
- Java 21 доступна в `PATH`;
- Maven доступен в `PATH`.

## Что сохранить после запуска
- вывод консоли или скриншот в [../evidence](../evidence);
- при наличии падений — stack trace и краткое описание дефекта в [../report/report.md](../report/report.md).
