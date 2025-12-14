package tech.nicorp.pm.git;

import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevTree;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.treewalk.EmptyTreeIterator;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GitService {
    private final GitConfig config;

    private Repository openRepo(UUID repoId) throws IOException {
        Path workDir = config.getRepoPath(repoId.toString());
        Path gitDir = workDir.resolve(".git");
        if (!Files.exists(gitDir)) throw new IOException("Repo not found");
        return new FileRepositoryBuilder()
                .setGitDir(gitDir.toFile())
                .setWorkTree(workDir.toFile())
                .build();
    }

    public List<String> branches(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            return git.branchList().call().stream()
                    .map(ref -> ref.getName().replace("refs/heads/", ""))
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public List<String> tags(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            return git.tagList().call().stream()
                    .map(ref -> ref.getName().replace("refs/tags/", ""))
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }

    public String defaultBranch(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId)) {
            String full = r.getFullBranch();
            if (full != null && full.startsWith("refs/heads/")) {
                return full.substring("refs/heads/".length());
            }
            
            try (Git git = new Git(r)) {
                List<String> branches = git.branchList().call().stream()
                    .map(ref -> ref.getName().replace("refs/heads/", ""))
                    .toList();
                
                if (branches.contains("main")) {
                    return "main";
                }
                if (branches.contains("master")) {
                    return "master";
                }
                if (!branches.isEmpty()) {
                    return branches.get(0);
                }
            }
            
            return "main";
        } catch (Exception e) {
            throw new IOException("Failed to get default branch: " + e.getMessage(), e);
        }
    }

    public List<Map<String, Object>> listFiles(UUID repoId, String ref, String path) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId commitId = r.resolve(ref);
            if (commitId == null) {
                List<String> branches = branches(repoId);
                if (branches.isEmpty()) {
                    return List.of();
                }
                String defaultBranch = branches.contains("main") ? "main" : 
                                      branches.contains("master") ? "master" : branches.get(0);
                commitId = r.resolve(defaultBranch);
                if (commitId == null) {
                    return List.of();
                }
            }
            
            try (RevWalk walk = new RevWalk(r)) {
                RevCommit commit = walk.parseCommit(commitId);
                RevTree tree = commit.getTree();
                
                if (path != null && !path.isEmpty()) {
                    try (TreeWalk pathWalk = TreeWalk.forPath(r, path, tree)) {
                        if (pathWalk == null) {
                            return List.of();
                        }
                        if (pathWalk.isSubtree()) {
                            tree = walk.parseTree(pathWalk.getObjectId(0));
                        } else {
                            return List.of();
                        }
                    }
                }
                
                try (TreeWalk tw = new TreeWalk(r)) {
                    tw.addTree(tree);
                    tw.setRecursive(false);
                    
                    List<Map<String, Object>> res = new ArrayList<>();
                    while (tw.next()) {
                        String fileName = tw.getNameString();
                        String fullPath = path != null && !path.isEmpty() 
                            ? path + "/" + fileName 
                            : fileName;
                        boolean isDir = tw.isSubtree();
                        
                        res.add(Map.of(
                            "path", fullPath,
                            "name", fileName,
                            "type", isDir ? "tree" : "blob"
                        ));
                    }
                    return res;
                }
            }
        } catch (Exception e) {
            throw new IOException("Failed to list files: " + e.getMessage(), e);
        }
    }

    public String fileContent(UUID repoId, String ref, String path) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId objId = r.resolve(ref + ":" + path);
            if (objId == null) throw new IOException("File not found");
            return new String(r.open(objId).getBytes());
        }
    }

    public byte[] fileBytes(UUID repoId, String ref, String path) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId objId = r.resolve(ref + ":" + path);
            if (objId == null) throw new IOException("File not found");
            return r.open(objId).getBytes();
        }
    }

    public String resolveRefSha(UUID repoId, String ref) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId id = r.resolve(ref);
            if (id == null) throw new IOException("Ref not found");
            return id.getName();
        }
    }

    public List<Map<String, Object>> commits(UUID repoId, String ref) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            ObjectId refId = r.resolve(ref);
            if (refId == null) return List.of();
            
            Iterable<RevCommit> log = git.log().add(refId).call();
            List<Map<String, Object>> res = new ArrayList<>();
            for (RevCommit c : log) {
                res.add(Map.of(
                        "sha", c.getName(),
                        "message", c.getFullMessage(),
                        "author", c.getAuthorIdent().getName(),
                        "date", c.getAuthorIdent().getWhen().toInstant().toString()
                ));
            }
            return res;
        } catch (Exception e) {
            return List.of();
        }
    }

    public List<DiffEntry> diff(UUID repoId, String sha) throws IOException {
        try (Repository r = openRepo(repoId); RevWalk walk = new RevWalk(r)) {
            RevCommit commit = walk.parseCommit(ObjectId.fromString(sha));
            RevCommit parent = commit.getParentCount() > 0 ? walk.parseCommit(commit.getParent(0)) : null;
            try (DiffFormatter df = new DiffFormatter(DisabledOutputStream.INSTANCE)) {
                df.setRepository(r);
                if (parent == null) {
                    return df.scan(new EmptyTreeIterator(), new CanonicalTreeParser(null, r.newObjectReader(), commit.getTree()));
                }
                return df.scan(parent.getTree(), commit.getTree());
            }
        }
    }

    public Map<String, Object> getCommitDiffDetails(UUID repoId, String sha) throws IOException {
        try (Repository r = openRepo(repoId); RevWalk walk = new RevWalk(r)) {
            RevCommit commit = walk.parseCommit(ObjectId.fromString(sha));
            RevCommit parent = commit.getParentCount() > 0 ? walk.parseCommit(commit.getParent(0)) : null;
            
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (DiffFormatter df = new DiffFormatter(out)) {
                df.setRepository(r);
                df.setContext(3); // 3 строки контекста
                
                List<DiffEntry> entries;
                if (parent == null) {
                    entries = df.scan(new EmptyTreeIterator(), 
                        new CanonicalTreeParser(null, r.newObjectReader(), commit.getTree()));
                } else {
                    entries = df.scan(parent.getTree(), commit.getTree());
                }
                
                List<Map<String, Object>> fileDiffs = new ArrayList<>();
                for (DiffEntry entry : entries) {
                    df.format(entry);
                    String patch = out.toString();
                    out.reset();
                    
                    String oldContent = "";
                    String newContent = "";
                    
                    try {
                        if (entry.getOldId() != null && !entry.getOldId().equals(ObjectId.zeroId())) {
                            oldContent = new String(r.open(entry.getOldId().toObjectId()).getBytes());
                        }
                        if (entry.getNewId() != null && !entry.getNewId().equals(ObjectId.zeroId())) {
                            newContent = new String(r.open(entry.getNewId().toObjectId()).getBytes());
                        }
                    } catch (Exception e) {
                        // Игнорировать ошибки для бинарных файлов
                    }
                    
                    fileDiffs.add(Map.of(
                        "oldPath", entry.getOldPath() != null ? entry.getOldPath() : "",
                        "newPath", entry.getNewPath() != null ? entry.getNewPath() : "",
                        "changeType", entry.getChangeType().name(),
                        "oldContent", oldContent,
                        "newContent", newContent,
                        "patch", patch
                    ));
                }
                
                return Map.of(
                    "commit", Map.of(
                        "sha", commit.getName(),
                        "message", commit.getFullMessage(),
                        "author", commit.getAuthorIdent().getName(),
                        "date", commit.getAuthorIdent().getWhen().toInstant().toString()
                    ),
                    "files", fileDiffs
                );
            }
        }
    }

    public List<String> listChangedPaths(UUID repoId, String oldSha, String newSha) throws IOException {
        try (Repository r = openRepo(repoId); RevWalk walk = new RevWalk(r)) {
            RevCommit newCommit = walk.parseCommit(ObjectId.fromString(newSha));
            RevCommit oldCommit = oldSha == null || oldSha.isBlank() ? null : walk.parseCommit(ObjectId.fromString(oldSha));
            try (DiffFormatter df = new DiffFormatter(DisabledOutputStream.INSTANCE)) {
                df.setRepository(r);
                List<DiffEntry> entries;
                if (oldCommit == null) {
                    entries = df.scan(new EmptyTreeIterator(), new CanonicalTreeParser(null, r.newObjectReader(), newCommit.getTree()));
                } else {
                    entries = df.scan(oldCommit.getTree(), newCommit.getTree());
                }
                List<String> paths = new ArrayList<>();
                for (DiffEntry de : entries) {
                    String p = switch (de.getChangeType()) {
                        case ADD, MODIFY, COPY, RENAME -> de.getNewPath();
                        case DELETE -> de.getOldPath();
                    };
                    paths.add(p);
                }
                return paths;
            }
        }
    }

    public void initRepository(UUID repoId) throws IOException {
        Path path = config.getRepoPath(repoId.toString());
        try {
            Files.createDirectories(path);
            Git git = Git.init()
                    .setDirectory(path.toFile())
                    .setBare(false)
                    .setInitialBranch("master")
                    .call();
            
            Repository repo = git.getRepository();
            repo.getConfig().setString("receive", null, "denyCurrentBranch", "updateInstead");
            repo.getConfig().setBoolean("http", null, "receivepack", true);
            repo.getConfig().save();
            
            git.close();
        } catch (Exception e) {
            throw new IOException("Failed to initialize repository: " + e.getMessage(), e);
        }
    }

    public void cloneRepository(String url, UUID repoId, String authToken) throws IOException {
        Path path = config.getRepoPath(repoId.toString());
        try {
            Files.createDirectories(path.getParent());
            Git.cloneRepository()
                    .setURI(url)
                    .setDirectory(path.toFile())
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to clone repository: " + e.getMessage(), e);
        }
    }

    public void createBranch(UUID repoId, String branchName, String fromRef) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            ObjectId startPoint = r.resolve(fromRef);
            if (startPoint == null) throw new IOException("Reference not found: " + fromRef);
            git.branchCreate()
                    .setName(branchName)
                    .setStartPoint(fromRef)
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to create branch: " + e.getMessage(), e);
        }
    }

    public void deleteBranch(UUID repoId, String branchName) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            git.branchDelete()
                    .setBranchNames(branchName)
                    .setForce(true)
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to delete branch: " + e.getMessage(), e);
        }
    }

    public void commitFile(UUID repoId, String branch, String path, String content, String message, String author) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            String currentBranch = r.getBranch();
            if (!currentBranch.equals(branch)) {
                git.checkout().setName(branch).call();
            }
            
            Path workDir = config.getRepoPath(repoId.toString());
            Path filePath = workDir.resolve(path);
            Files.createDirectories(filePath.getParent());
            Files.writeString(filePath, content);
            
            // Добавить только изменённый файл, но сохранить остальные в коммите
            git.add().addFilepattern(path).call();
            git.commit()
                    .setOnly(path)  // ← Коммитить только этот файл!
                    .setMessage(message)
                    .setAuthor(author, author + "@nicorp.tech")
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to commit file: " + e.getMessage(), e);
        }
    }

    public void deleteFile(UUID repoId, String branch, String path, String message, String author) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            String currentBranch = r.getBranch();
            if (!currentBranch.equals(branch)) {
                git.checkout().setName(branch).call();
            }
            
            Path workDir = config.getRepoPath(repoId.toString());
            Path filePath = workDir.resolve(path);
            Files.deleteIfExists(filePath);
            
            git.rm().addFilepattern(path).call();
            git.commit()
                    .setMessage(message)
                    .setAuthor(author, author + "@nicorp.tech")
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to delete file: " + e.getMessage(), e);
        }
    }
}


