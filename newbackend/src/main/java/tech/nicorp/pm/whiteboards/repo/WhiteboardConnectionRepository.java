package tech.nicorp.pm.whiteboards.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.whiteboards.domain.WhiteboardConnection;

import java.util.UUID;

public interface WhiteboardConnectionRepository extends JpaRepository<WhiteboardConnection, UUID> {
}


