package tech.nicorp.pm.ai.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.ai.domain.ChatMessage;

import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByChat_IdOrderByCreatedAtAsc(UUID chatId);
}
