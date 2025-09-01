package tech.nicorp.pm.whiteboards.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.whiteboards.domain.Whiteboard;

import java.util.Optional;
import java.util.UUID;

public interface WhiteboardRepository extends JpaRepository<Whiteboard, UUID> {
    Optional<Whiteboard> findByProject_Id(UUID projectId);
}


