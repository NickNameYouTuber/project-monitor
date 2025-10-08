-- Добавление полей для Calendar View в таблицу calls

ALTER TABLE calls
ADD COLUMN IF NOT EXISTS scheduled_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'SCHEDULED';

-- Создаем индексы для эффективного поиска по датам и статусу
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_time ON calls(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_scheduled_status ON calls(scheduled_time, status);

-- Обновляем существующие записи: если scheduled_time NULL, используем created_at
UPDATE calls 
SET scheduled_time = created_at 
WHERE scheduled_time IS NULL;

-- Устанавливаем дефолтную длительность 30 минут для существующих звонков
UPDATE calls 
SET duration_minutes = 30 
WHERE duration_minutes IS NULL;

-- Комментарии к полям
COMMENT ON COLUMN calls.scheduled_time IS 'Запланированное время начала звонка';
COMMENT ON COLUMN calls.duration_minutes IS 'Ожидаемая длительность звонка в минутах';
COMMENT ON COLUMN calls.status IS 'Статус звонка: SCHEDULED, ACTIVE, COMPLETED, CANCELLED';

