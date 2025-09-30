package tech.nicorp.pm.calls.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallParticipant;

import java.util.List;
import java.util.UUID;

public interface CallParticipantRepository extends JpaRepository<CallParticipant, UUID> {
    List<CallParticipant> findByCall(Call call);
}


