# Папка tests для дипломного тестирования

В этой папке собраны артефакты тестирования для сдачи по дипломному проекту.

## Структура
- [mindmap/project-testing-mindmap.md](mindmap/project-testing-mindmap.md) — интеллект-карта с модулями, типами тестирования, рисками и идеями для исследовательского тестирования.
- [test-cases/test-cases.csv](test-cases/test-cases.csv) — ручные тест-кейсы для ключевых сценариев продукта.
- [test-cases/coverage-matrix.md](test-cases/coverage-matrix.md) — матрица трассировки между ручными кейсами, API и автотестами.
- [tests/TESTING-STRATEGY.md](tests/TESTING-STRATEGY.md) — выбранные уровни автоматизации и обоснование.
- [tests/RUN.md](tests/RUN.md) — инструкция по запуску тестов одной командой.
- [report/report.md](report/report.md) — черновик краткого отчета для последующего экспорта в PDF.
- [evidence](evidence) — папка для скриншотов, логов запуска и итоговых PDF-файлов.

## Область покрытия
Текущая реализация сосредоточена на активном Java-бэкенде в [newbackend](../newbackend) и в первую очередь покрывает:
1. организации;
2. проекты;
3. задачи.

Автотесты размещены в [newbackend/src/test/java](../newbackend/src/test/java), чтобы их можно было запускать одной Maven-командой.
