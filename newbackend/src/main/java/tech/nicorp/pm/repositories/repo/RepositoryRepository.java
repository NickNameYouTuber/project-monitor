package tech.nicorp.pm.repositories.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.repositories.domain.Repository;

import java.util.UUID;

public interface RepositoryRepository extends JpaRepository<Repository, UUID> {
}


