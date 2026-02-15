CREATE TABLE widget_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    widget_id VARCHAR(255) NOT NULL,
    widget_type VARCHAR(50) NOT NULL,
    selected_value TEXT,
    selected_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (chat_message_id, widget_id)
);

CREATE INDEX idx_widget_states_chat_message_id ON widget_states(chat_message_id);
CREATE INDEX idx_widget_states_user_id ON widget_states(user_id);
