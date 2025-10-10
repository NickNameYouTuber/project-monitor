package tech.nicorp.pm.calls.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CallRepository extends JpaRepository<Call, UUID> {
    Optional<Call> findByRoomId(String roomId);
    
    @Query("SELECT c FROM Call c WHERE c.scheduledTime >= :start AND c.scheduledTime < :end ORDER BY c.scheduledTime")
    List<Call> findByScheduledTimeBetween(OffsetDateTime start, OffsetDateTime end);
    
    // Для автоматического управления статусами
    List<Call> findByStatusAndScheduledTimeBefore(CallStatus status, OffsetDateTime time);
    List<Call> findByStatusAndEndAtBefore(CallStatus status, OffsetDateTime time);
}


