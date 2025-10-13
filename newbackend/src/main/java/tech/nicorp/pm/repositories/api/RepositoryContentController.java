package tech.nicorp.pm.repositories.api;

import org.eclipse.jgit.diff.DiffEntry;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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

    @GetMapping(value = "/file", produces = {MediaType.TEXT_PLAIN_VALUE, MediaType.APPLICATION_OCTET_STREAM_VALUE})
    public ResponseEntity<?> getFile(@PathVariable("repoId") UUID repoId, @RequestParam("ref") String ref, @RequestParam("path") String path) throws IOException {
        String lowerPath = path.toLowerCase();
        if (lowerPath.endsWith(".png") || lowerPath.endsWith(".jpg") || lowerPath.endsWith(".jpeg") ||
            lowerPath.endsWith(".gif") || lowerPath.endsWith(".svg") || lowerPath.endsWith(".webp") ||
            lowerPath.endsWith(".bmp") || lowerPath.endsWith(".ico")) {
            
            byte[] bytes = git.fileBytes(repoId, ref, path);
            String ext = lowerPath.substring(lowerPath.lastIndexOf('.') + 1);
            MediaType contentType = MediaType.IMAGE_PNG;
            
            switch (ext) {
                case "jpg":
                case "jpeg":
                    contentType = MediaType.IMAGE_JPEG;
                    break;
                case "gif":
                    contentType = MediaType.IMAGE_GIF;
                    break;
                case "svg":
                    contentType = MediaType.parseMediaType("image/svg+xml");
                    break;
                case "webp":
                    contentType = MediaType.parseMediaType("image/webp");
                    break;
                case "bmp":
                    contentType = MediaType.parseMediaType("image/bmp");
                    break;
                case "ico":
                    contentType = MediaType.parseMediaType("image/x-icon");
                    break;
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(contentType);
            headers.setCacheControl("max-age=3600");
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(bytes);
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.TEXT_PLAIN)
                .body(git.fileContent(repoId, ref, path));
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


