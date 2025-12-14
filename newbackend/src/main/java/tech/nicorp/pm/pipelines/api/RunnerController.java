package tech.nicorp.pm.pipelines.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.pipelines.domain.PipelineJob;
import tech.nicorp.pm.pipelines.repo.PipelineLogChunkRepository;
import tech.nicorp.pm.pipelines.service.RunnerService;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/pipelines/runners")
public class RunnerController {

    private final RunnerService runnerService;
    private final PipelineLogChunkRepository logRepo;

    public RunnerController(RunnerService runnerService, PipelineLogChunkRepository logRepo) {
        this.runnerService = runnerService;
        this.logRepo = logRepo;
    }

    @PostMapping("/lease")
    public ResponseEntity<Map<String, Object>> leaseJob(@RequestBody(required = false) Map<String, Object> runnerInfo) {
        Optional<PipelineJob> leased = runnerService.leaseJob(runnerInfo == null ? Map.of() : runnerInfo);
        return ResponseEntity.ok(leased.<Map<String, Object>>map(j -> Map.of(
                        "jobId", j.getId(),
                        "image", j.getImage(),
                        "script", j.getScript(),
                        "env", j.getEnvJson(),
                        "leasedAt", OffsetDateTime.now().toString()
                )).orElseGet(() -> Map.of(
                        "jobId", null,
                        "leasedAt", OffsetDateTime.now().toString()
                )));
    }

    @PostMapping("/jobs/{jobId}/logs")
    public ResponseEntity<Void> submitLogs(@PathVariable UUID jobId, @RequestBody String logsChunk) {
        runnerService.appendLogs(jobId, logsChunk);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/jobs/{jobId}/status")
    public ResponseEntity<Void> submitStatus(@PathVariable UUID jobId, @RequestBody Map<String, Object> status) {
        runnerService.updateStatus(jobId, status);
        return ResponseEntity.noContent().build();
    }
}


