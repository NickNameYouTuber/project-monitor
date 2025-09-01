package tech.nicorp.pm.projects.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.projects.domain.Project;

import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, UUID> {
}



