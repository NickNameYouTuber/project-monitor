package tech.nicorp.pm.pipelines.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.pipelines.domain.PipelineLogChunk;

import java.util.List;
import java.util.UUID;

public interface PipelineLogChunkRepository extends JpaRepository<PipelineLogChunk, UUID> {
    List<PipelineLogChunk> findByJobIdOrderByCreatedAtAsc(UUID jobId);
}


