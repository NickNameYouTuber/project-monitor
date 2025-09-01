package tech.nicorp.pm.merge.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.merge.domain.MergeRequestApproval;

import java.util.List;
import java.util.UUID;

public interface MergeRequestApprovalRepository extends JpaRepository<MergeRequestApproval, UUID> {
    List<MergeRequestApproval> findByMergeRequestId(UUID mrId);
    void deleteByMergeRequestIdAndUserId(UUID mrId, UUID userId);
}


