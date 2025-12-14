package tech.nicorp.pm.ai.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.ai.domain.Chat;

import java.util.List;
import java.util.UUID;

public interface ChatRepository extends JpaRepository<Chat, UUID> {
    List<Chat> findByUser_IdOrderByUpdatedAtDesc(UUID userId);
    List<Chat> findByUser_IdAndOrganizationIdOrderByUpdatedAtDesc(UUID userId, UUID organizationId);
    List<Chat> findByUser_IdAndProjectIdOrderByUpdatedAtDesc(UUID userId, UUID projectId);
}
