package tech.nicorp.pm.pipelines.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.pipelines.domain.PipelineJob;
import tech.nicorp.pm.pipelines.repo.PipelineJobRepository;
import tech.nicorp.pm.pipelines.repo.PipelineLogChunkRepository;
import tech.nicorp.pm.pipelines.service.PipelineService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pipelines/jobs")
public class PipelineJobsController {

    private final PipelineLogChunkRepository logRepo;
    private final PipelineJobRepository jobRepo;
    private final PipelineService pipelineService;

    public PipelineJobsController(PipelineLogChunkRepository logRepo, PipelineJobRepository jobRepo, PipelineService pipelineService) {
        this.logRepo = logRepo;
        this.jobRepo = jobRepo;
        this.pipelineService = pipelineService;
    }

    @GetMapping("/{jobId}/logs")
    public ResponseEntity<String> getLogs(@PathVariable UUID jobId) {
        StringBuilder sb = new StringBuilder();
        logRepo.findByJobIdOrderByCreatedAtAsc(jobId).forEach(c -> sb.append(c.getContent()));
        return ResponseEntity.ok(sb.toString());
    }

    @PostMapping("/{jobId}/start")
    public ResponseEntity<Map<String, Object>> startManual(@PathVariable UUID jobId) {
        PipelineJob job = pipelineService.releaseManual(jobId);
        return ResponseEntity.ok(Map.of(
                "id", job.getId(),
                "status", job.getStatus().name(),
                "manual_released", job.isManualReleased()
        ));
    }
}


