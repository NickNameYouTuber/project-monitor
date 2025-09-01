package tech.nicorp.pm.merge.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.merge.domain.MergeRequestNote;

import java.util.List;
import java.util.UUID;

public interface MergeRequestNoteRepository extends JpaRepository<MergeRequestNote, UUID> {
    List<MergeRequestNote> findByDiscussionIdOrderByCreatedAtAsc(UUID discussionId);
}


