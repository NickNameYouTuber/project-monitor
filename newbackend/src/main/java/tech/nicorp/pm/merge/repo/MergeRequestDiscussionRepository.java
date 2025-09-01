package tech.nicorp.pm.merge.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.merge.domain.MergeRequestDiscussion;

import java.util.List;
import java.util.UUID;

public interface MergeRequestDiscussionRepository extends JpaRepository<MergeRequestDiscussion, UUID> {
    List<MergeRequestDiscussion> findByMergeRequestIdOrderByCreatedAtAsc(UUID mrId);
}


