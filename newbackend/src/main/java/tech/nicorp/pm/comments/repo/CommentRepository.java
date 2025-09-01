package tech.nicorp.pm.comments.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.comments.domain.Comment;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);
}


