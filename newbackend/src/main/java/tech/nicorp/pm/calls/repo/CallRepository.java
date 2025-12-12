package tech.nicorp.pm.calls.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CallRepository extends JpaRepository<Call, UUID> {
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user WHERE c.roomId = :roomId")
    Optional<Call> findByRoomId(@Param("roomId") String roomId);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user WHERE c.id = :id")
    Optional<Call> findByIdWithParticipants(@Param("id") UUID id);
    
    @Query("SELECT c FROM Call c WHERE c.scheduledTime >= :start AND c.scheduledTime < :end ORDER BY c.scheduledTime")
    List<Call> findByScheduledTimeBetween(OffsetDateTime start, OffsetDateTime end);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user " +
           "WHERE c.id IN (SELECT cp.call.id FROM CallParticipant cp WHERE cp.user.id = :userId) " +
           "ORDER BY c.scheduledTime DESC")
    List<Call> findByParticipantUserId(@Param("userId") UUID userId);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user " +
           "WHERE c.status = :status AND c.scheduledTime < :time ORDER BY c.scheduledTime")
    List<Call> findByStatusAndScheduledTimeBefore(@Param("status") CallStatus status, @Param("time") OffsetDateTime time);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user " +
           "WHERE c.status = :status AND c.endAt < :time ORDER BY c.endAt")
    List<Call> findByStatusAndEndAtBefore(@Param("status") CallStatus status, @Param("time") OffsetDateTime time);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user " +
           "WHERE c.status = :status AND c.scheduledTime >= :start AND c.scheduledTime < :end ORDER BY c.scheduledTime")
    List<Call> findByStatusAndScheduledTimeBetween(@Param("status") CallStatus status, @Param("start") OffsetDateTime start, @Param("end") OffsetDateTime end);
    
    @Query("SELECT DISTINCT c FROM Call c LEFT JOIN FETCH c.participants p LEFT JOIN FETCH p.user " +
           "WHERE c.recurrenceGroupId = :groupId ORDER BY c.scheduledTime ASC")
    List<Call> findByRecurrenceGroupId(@Param("groupId") UUID groupId);
}


