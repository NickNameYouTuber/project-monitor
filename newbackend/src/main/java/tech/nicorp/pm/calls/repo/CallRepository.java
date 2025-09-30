package tech.nicorp.pm.calls.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.calls.domain.Call;

import java.util.Optional;
import java.util.UUID;

public interface CallRepository extends JpaRepository<Call, UUID> {
    Optional<Call> findByRoomId(String roomId);
}


