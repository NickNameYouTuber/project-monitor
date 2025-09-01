package tech.nicorp.pm.merge.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.merge.domain.MergeRequestDiscussion;
import tech.nicorp.pm.merge.domain.MergeRequestNote;
import tech.nicorp.pm.merge.repo.MergeRequestDiscussionRepository;
import tech.nicorp.pm.merge.repo.MergeRequestNoteRepository;
import tech.nicorp.pm.security.SecurityUtil;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repoId}/merge_requests/{mrId}/discussions")
public class MergeRequestDiscussionsController {

    private final MergeRequestDiscussionRepository discussions;
    private final MergeRequestNoteRepository notes;
    private final UserRepository users;

    public MergeRequestDiscussionsController(MergeRequestDiscussionRepository discussions, MergeRequestNoteRepository notes, UserRepository users) {
        this.discussions = discussions;
        this.notes = notes;
        this.users = users;
    }

    @GetMapping
    public ResponseEntity<List<MergeRequestDiscussion>> list(@PathVariable UUID mrId) {
        return ResponseEntity.ok(discussions.findByMergeRequestIdOrderByCreatedAtAsc(mrId));
    }

    @PostMapping
    public ResponseEntity<MergeRequestDiscussion> create(@PathVariable UUID mrId, @RequestBody Map<String, Object> body) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        MergeRequestDiscussion d = new MergeRequestDiscussion();
        d.setMergeRequest(new tech.nicorp.pm.merge.domain.MergeRequest());
        d.getMergeRequest().setId(mrId);
        d.setAuthor(users.findById(userId).orElseThrow());
        d.setFilePath((String) body.get("file_path"));
        d.setLineNumber(body.get("line_number") instanceof Number n ? n.intValue() : null);
        return ResponseEntity.ok(discussions.save(d));
    }

    @PostMapping("/{discussionId}/notes")
    public ResponseEntity<MergeRequestNote> addNote(@PathVariable UUID discussionId, @RequestBody Map<String, String> body) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        MergeRequestNote n = new MergeRequestNote();
        n.setDiscussion(discussions.findById(discussionId).orElseThrow());
        n.setAuthor(users.findById(userId).orElseThrow());
        n.setContent(body.get("content"));
        return ResponseEntity.ok(notes.save(n));
    }

    @PostMapping("/{discussionId}/resolve")
    public ResponseEntity<Map<String, String>> resolve(@PathVariable UUID discussionId) {
        MergeRequestDiscussion d = discussions.findById(discussionId).orElseThrow();
        d.setResolved(true);
        discussions.save(d);
        return ResponseEntity.ok(Map.of("status", "ok"));
    }
}


