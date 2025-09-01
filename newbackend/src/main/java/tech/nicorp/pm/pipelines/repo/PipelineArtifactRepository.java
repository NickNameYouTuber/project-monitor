package tech.nicorp.pm.pipelines.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.pipelines.domain.PipelineArtifact;

import java.util.List;
import java.util.UUID;

public interface PipelineArtifactRepository extends JpaRepository<PipelineArtifact, UUID> {
    List<PipelineArtifact> findByJobId(UUID jobId);
}


