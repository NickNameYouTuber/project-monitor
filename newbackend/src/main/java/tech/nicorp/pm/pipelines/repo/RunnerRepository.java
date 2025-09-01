package tech.nicorp.pm.pipelines.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.pipelines.domain.Runner;

import java.util.UUID;

public interface RunnerRepository extends JpaRepository<Runner, UUID> {
}


