package tech.nicorp.pm.whiteboards.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.whiteboards.domain.WhiteboardElement;

import java.util.UUID;

public interface WhiteboardElementRepository extends JpaRepository<WhiteboardElement, UUID> {
}


