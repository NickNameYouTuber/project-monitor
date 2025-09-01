package tech.nicorp.pm.pipelines.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.pipelines.domain.PipelineJob;

import java.util.UUID;

public interface PipelineJobRepository extends JpaRepository<PipelineJob, UUID> {
}


