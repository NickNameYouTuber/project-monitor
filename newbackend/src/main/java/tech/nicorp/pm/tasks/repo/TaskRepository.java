package tech.nicorp.pm.tasks.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.tasks.domain.Task;

import java.util.List;
import java.util.UUID;

public interface TaskRepository extends JpaRepository<Task, UUID> {
    List<Task> findByProject_IdOrderByOrderIndexAsc(UUID projectId);
    List<Task> findByColumn_IdOrderByOrderIndexAsc(UUID columnId);
}


