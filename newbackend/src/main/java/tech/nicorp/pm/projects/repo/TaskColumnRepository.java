package tech.nicorp.pm.projects.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.projects.domain.TaskColumn;

import java.util.UUID;

public interface TaskColumnRepository extends JpaRepository<TaskColumn, UUID> {
}



