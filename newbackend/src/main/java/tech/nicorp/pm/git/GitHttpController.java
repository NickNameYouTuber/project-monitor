package tech.nicorp.pm.git;

import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.transport.UploadPack;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

@RestController
@RequestMapping("/git")
@RequiredArgsConstructor
public class GitHttpController {
    private final GitConfig config;

    @GetMapping("/{repoId}.git/info/refs")
    public ResponseEntity<byte[]> infoRefs(
            @PathVariable("repoId") String repoId,
            @RequestParam(value = "service", required = false) String service) throws IOException {
        
        Path repoPath = config.getRepoPath(repoId);
        if (!Files.exists(repoPath)) {
            return ResponseEntity.notFound().build();
        }

        try (Repository repo = new FileRepositoryBuilder().setGitDir(repoPath.toFile()).build()) {
            if ("git-upload-pack".equals(service)) {
                ByteArrayOutputStream out = new ByteArrayOutputStream();
                
                String serviceName = "# service=git-upload-pack\n";
                out.write(String.format("%04x", serviceName.length() + 4).getBytes());
                out.write(serviceName.getBytes());
                out.write("0000".getBytes());
                
                UploadPack uploadPack = new UploadPack(repo);
                uploadPack.setBiDirectionalPipe(false);
                uploadPack.sendAdvertisedRefs(new org.eclipse.jgit.transport.RefAdvertiser.PacketLineOutRefAdvertiser(
                    new org.eclipse.jgit.transport.PacketLineOut(out)));
                
                HttpHeaders headers = new HttpHeaders();
                headers.add("Content-Type", "application/x-git-upload-pack-advertisement");
                headers.add("Cache-Control", "no-cache");
                return new ResponseEntity<>(out.toByteArray(), headers, HttpStatus.OK);
            }
            
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping(value = "/{repoId}.git/git-upload-pack")
    public ResponseEntity<byte[]> uploadPack(
            @PathVariable("repoId") String repoId,
            @RequestBody byte[] body) throws IOException {
        
        Path repoPath = config.getRepoPath(repoId);
        if (!Files.exists(repoPath)) {
            return ResponseEntity.notFound().build();
        }

        try (Repository repo = new FileRepositoryBuilder().setGitDir(repoPath.toFile()).build()) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            UploadPack uploadPack = new UploadPack(repo);
            uploadPack.setBiDirectionalPipe(false);
            uploadPack.upload(new ByteArrayInputStream(body), out, null);
            
            HttpHeaders headers = new HttpHeaders();
            headers.add("Content-Type", "application/x-git-upload-pack-result");
            headers.add("Cache-Control", "no-cache");
            return new ResponseEntity<>(out.toByteArray(), headers, HttpStatus.OK);
        }
    }
}


