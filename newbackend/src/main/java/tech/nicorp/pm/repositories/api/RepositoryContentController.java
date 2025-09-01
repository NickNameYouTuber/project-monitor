package tech.nicorp.pm.repositories.api;

import org.eclipse.jgit.diff.DiffEntry;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.git.GitService;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repoId}")
public class RepositoryContentController {

    private final GitService git;

    public RepositoryContentController(GitService git) {
        this.git = git;
    }

    @GetMapping("/files")
    public ResponseEntity<Object> listFiles(@PathVariable UUID repoId, @RequestParam String ref, @RequestParam(required = false) String path) throws IOException {
        return ResponseEntity.ok(git.listFiles(repoId, ref, path));
    }

    @GetMapping("/file")
    public ResponseEntity<String> getFile(@PathVariable UUID repoId, @RequestParam String ref, @RequestParam String path) throws IOException {
        return ResponseEntity.ok(git.fileContent(repoId, ref, path));
    }

    @GetMapping("/commits")
    public ResponseEntity<Object> listCommits(@PathVariable UUID repoId, @RequestParam String ref) throws IOException {
        return ResponseEntity.ok(git.commits(repoId, ref));
    }

    @GetMapping("/commits/{sha}/diff")
    public ResponseEntity<List<DiffEntry>> commitDiff(@PathVariable UUID repoId, @PathVariable String sha) throws IOException {
        return ResponseEntity.ok(git.diff(repoId, sha));
    }
}


