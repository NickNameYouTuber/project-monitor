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
    public ResponseEntity<Object> listFiles(@PathVariable("repoId") UUID repoId, @RequestParam("ref") String ref, @RequestParam(value = "path", required = false) String path) throws IOException {
        return ResponseEntity.ok(git.listFiles(repoId, ref, path));
    }

    @GetMapping("/file")
    public ResponseEntity<?> getFile(@PathVariable("repoId") UUID repoId, @RequestParam("ref") String ref, @RequestParam("path") String path) throws IOException {
        String lowerPath = path.toLowerCase();
        if (lowerPath.endsWith(".png") || lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg") ||
            lowerPath.endsWith(".gif") || lowerPath.endsWith(".svg") || lowerPath.endsWith(".webp") ||
            lowerPath.endsWith(".bmp") || lowerPath.endsWith(".ico")) {
            
            byte[] bytes = git.fileBytes(repoId, ref, path);
            String contentType = "image/" + lowerPath.substring(lowerPath.lastIndexOf('.') + 1);
            if (lowerPath.endsWith(".svg")) contentType = "image/svg+xml";
            if (lowerPath.endsWith(".ico")) contentType = "image/x-icon";
            
            return ResponseEntity.ok()
                    .header("Content-Type", contentType)
                    .body(bytes);
        }
        
        return ResponseEntity.ok(git.fileContent(repoId, ref, path));
    }

    @GetMapping("/commits")
    public ResponseEntity<Object> listCommits(@PathVariable("repoId") UUID repoId, @RequestParam("ref") String ref) throws IOException {
        return ResponseEntity.ok(git.commits(repoId, ref));
    }

    @GetMapping("/commits/{sha}/diff")
    public ResponseEntity<List<DiffEntry>> commitDiff(@PathVariable("repoId") UUID repoId, @PathVariable("sha") String sha) throws IOException {
        return ResponseEntity.ok(git.diff(repoId, sha));
    }
}


