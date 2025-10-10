-- Создание таблицы участников звонков
CREATE TABLE call_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'PARTICIPANT',
    status VARCHAR(20) NOT NULL DEFAULT 'INVITED',
    invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    joined_at TIMESTAMP WITH TIME ZONE,
    left_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT unique_call_user UNIQUE(call_id, user_id)
);

-- Индексы для производительности
CREATE INDEX idx_call_participants_call_id ON call_participants(call_id);
CREATE INDEX idx_call_participants_user_id ON call_participants(user_id);
CREATE INDEX idx_call_participants_status ON call_participants(status);
CREATE INDEX idx_call_participants_role ON call_participants(role);

