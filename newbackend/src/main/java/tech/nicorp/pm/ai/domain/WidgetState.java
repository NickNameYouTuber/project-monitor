package tech.nicorp.pm.ai.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Stores the selected state of AI chat widgets (questions, confirmations, etc.)
 * Allows widgets to persist their state across page reloads.
 */
@Entity
@Table(name = "widget_states")
@Getter
@Setter
@NoArgsConstructor
public class WidgetState {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_message_id", nullable = false)
    private ChatMessage chatMessage;

    /**
     * Unique identifier of the widget within the message
     * (e.g., "question-1", "confirmation-2")
     */
    @Column(name = "widget_id", nullable = false, length = 255)
    private String widgetId;

    /**
     * Type of widget: "question", "action_confirmation", etc.
     */
    @Column(name = "widget_type", nullable = false, length = 50)
    private String widgetType;

    /**
     * Selected value (e.g., option ID for questions, "true"/"false" for confirmations)
     */
    @Column(name = "selected_value", columnDefinition = "text")
    private String selectedValue;

    /**
     * When the selection was made
     */
    @Column(name = "selected_at")
    private OffsetDateTime selectedAt;

    /**
     * Which user made the selection
     */
    @Column(name = "user_id", columnDefinition = "uuid")
    private UUID userId;
}
