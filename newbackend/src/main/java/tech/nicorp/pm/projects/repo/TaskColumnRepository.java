package tech.nicorp.pm.projects.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.projects.domain.TaskColumn;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TaskColumnRepository extends JpaRepository<TaskColumn, UUID> {
    List<TaskColumn> findByProject_IdOrderByOrderIndexAsc(UUID projectId);
    List<TaskColumn> findByProject_Id(UUID projectId);
    Optional<TaskColumn> findByProject_IdAndNameIgnoreCase(UUID projectId, String name);
}



