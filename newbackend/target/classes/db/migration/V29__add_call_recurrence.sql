-- Добавление полей для повторяющихся встреч
ALTER TABLE calls 
ADD COLUMN recurrence_group_id UUID,
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_type VARCHAR(20),
ADD COLUMN recurrence_days VARCHAR(50),
ADD COLUMN recurrence_end_date TIMESTAMP WITH TIME ZONE;

-- Индекс для быстрого поиска группы повторяющихся встреч
CREATE INDEX idx_calls_recurrence_group ON calls(recurrence_group_id);

-- Комментарии для документирования
COMMENT ON COLUMN calls.recurrence_group_id IS 'UUID группы повторяющихся встреч';
COMMENT ON COLUMN calls.is_recurring IS 'Флаг: является ли встреча частью повторяющейся серии';
COMMENT ON COLUMN calls.recurrence_type IS 'Тип повторения: NONE, DAILY, WEEKLY, MONTHLY';
COMMENT ON COLUMN calls.recurrence_days IS 'JSON массив дней недели для WEEKLY: [1,2,3,4,5] где 1=Пн, 7=Вс';
COMMENT ON COLUMN calls.recurrence_end_date IS 'Дата окончания повторений';

