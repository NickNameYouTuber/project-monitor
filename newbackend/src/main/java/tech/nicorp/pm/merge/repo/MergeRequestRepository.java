package tech.nicorp.pm.merge.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.merge.domain.MergeRequest;

import java.util.List;
import java.util.UUID;

public interface MergeRequestRepository extends JpaRepository<MergeRequest, UUID> {
    List<MergeRequest> findByRepositoryIdOrderByCreatedAtDesc(UUID repoId);
}


