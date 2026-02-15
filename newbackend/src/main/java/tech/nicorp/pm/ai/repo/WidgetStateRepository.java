package tech.nicorp.pm.ai.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.ai.domain.WidgetState;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WidgetStateRepository extends JpaRepository<WidgetState, UUID> {
    /**
     * Find widget state by chat message ID and widget ID
     */
    Optional<WidgetState> findByChatMessage_IdAndWidgetId(UUID chatMessageId, String widgetId);

    /**
     * Find all widget states for a chat message
     */
    List<WidgetState> findByChatMessage_Id(UUID chatMessageId);

    /**
     * Find all widget states for an entire chat (across all messages)
     */
    List<WidgetState> findByChatMessage_Chat_Id(UUID chatId);
}
