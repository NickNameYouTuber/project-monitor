package tech.nicorp.pm.pipelines.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.pipelines.domain.Pipeline;
import tech.nicorp.pm.pipelines.service.PipelineService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/pipelines")
public class PipelinesController {

    private final PipelineService pipelineService;

    public PipelinesController(PipelineService pipelineService) {
        this.pipelineService = pipelineService;
    }

    @PostMapping("/trigger")
    public ResponseEntity<Pipeline> triggerPipeline(@RequestBody Map<String, Object> request) {
        Pipeline p = pipelineService.trigger(request);
        return ResponseEntity.ok(p);
    }

    @PostMapping("/{pipelineId}/cancel")
    public ResponseEntity<Void> cancelPipeline(@PathVariable("pipelineId") UUID pipelineId) {
        pipelineService.cancel(pipelineId);
        return ResponseEntity.noContent().build();
    }
}


