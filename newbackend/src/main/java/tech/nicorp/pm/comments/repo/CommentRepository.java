package tech.nicorp.pm.comments.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tech.nicorp.pm.comments.domain.Comment;

import java.util.List;
import java.util.UUID;

public interface CommentRepository extends JpaRepository<Comment, UUID> {
    List<Comment> findByTaskIdOrderByCreatedAtAsc(UUID taskId);

    @Query("select c from Comment c join fetch c.user where c.taskId = :taskId order by c.createdAt asc")
    List<Comment> findWithUserByTaskIdOrderByCreatedAtAsc(@Param("taskId") UUID taskId);

    @Query("select c from Comment c join fetch c.user where c.id = :id")
    java.util.Optional<Comment> findByIdFetchUser(@Param("id") UUID id);
}


