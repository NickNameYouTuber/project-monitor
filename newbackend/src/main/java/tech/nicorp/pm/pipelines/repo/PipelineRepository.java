package tech.nicorp.pm.pipelines.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.pipelines.domain.Pipeline;

import java.util.UUID;

public interface PipelineRepository extends JpaRepository<Pipeline, UUID> {
}


