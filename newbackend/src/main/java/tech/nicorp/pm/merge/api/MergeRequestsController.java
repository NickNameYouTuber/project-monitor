package tech.nicorp.pm.merge.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.merge.domain.MergeRequest;
import tech.nicorp.pm.merge.service.MergeRequestService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repoId}/merge_requests")
public class MergeRequestsController {

    private final MergeRequestService mrs;

    public MergeRequestsController(MergeRequestService mrs) {
        this.mrs = mrs;
    }

    @PostMapping
    public ResponseEntity<MergeRequest> create(@PathVariable UUID repoId, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(mrs.create(repoId, body));
    }

    @GetMapping
    public ResponseEntity<List<MergeRequest>> list(@PathVariable UUID repoId) {
        return ResponseEntity.ok(mrs.list(repoId));
    }

    @GetMapping("/{mrId}")
    public ResponseEntity<MergeRequest> detail(@PathVariable UUID repoId, @PathVariable UUID mrId) {
        return ResponseEntity.ok(mrs.detail(repoId, mrId));
    }

    @PostMapping("/{mrId}/approve")
    public ResponseEntity<Map<String, String>> approve(@PathVariable UUID repoId, @PathVariable UUID mrId) {
        mrs.approve(repoId, mrId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/{mrId}/unapprove")
    public ResponseEntity<Map<String, String>> unapprove(@PathVariable UUID repoId, @PathVariable UUID mrId) {
        mrs.unapprove(repoId, mrId);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }

    @PostMapping("/{mrId}/merge")
    public ResponseEntity<MergeRequest> merge(@PathVariable UUID repoId, @PathVariable UUID mrId) {
        return ResponseEntity.ok(mrs.merge(repoId, mrId));
    }
}


