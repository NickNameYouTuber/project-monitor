package tech.nicorp.pm.git;

import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.diff.DiffEntry;
import org.eclipse.jgit.diff.DiffFormatter;
import org.eclipse.jgit.lib.ObjectId;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.revwalk.RevCommit;
import org.eclipse.jgit.revwalk.RevWalk;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.treewalk.TreeWalk;
import org.eclipse.jgit.treewalk.CanonicalTreeParser;
import org.eclipse.jgit.treewalk.EmptyTreeIterator;
import org.eclipse.jgit.treewalk.filter.PathFilter;
import org.eclipse.jgit.util.io.DisabledOutputStream;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;

@Service
@RequiredArgsConstructor
public class GitService {
    private final GitConfig config;

    private Repository openRepo(UUID repoId) throws IOException {
        Path path = config.getRepoPath(repoId.toString());
        if (!Files.exists(path)) throw new IOException("Repo not found");
        return new FileRepositoryBuilder().setGitDir(path.toFile()).build();
    }

    public List<Map<String, String>> branches(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            return git.branchList().call().stream()
                    .map(ref -> Map.of("name", ref.getName().replace("refs/heads/", "")))
                    .toList();
        } catch (Exception e) {
            throw new IOException(e);
        }
    }

    public List<Map<String, String>> tags(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            return git.tagList().call().stream()
                    .map(ref -> Map.of("name", ref.getName().replace("refs/tags/", "")))
                    .toList();
        } catch (Exception e) {
            throw new IOException(e);
        }
    }

    public String defaultBranch(UUID repoId) throws IOException {
        try (Repository r = openRepo(repoId)) {
            String full = r.getFullBranch();
            if (full != null && full.startsWith("refs/heads/")) {
                return full.substring("refs/heads/".length());
            }
            return "master";
        }
    }

    public List<Map<String, Object>> listFiles(UUID repoId, String ref, String path) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId commitId = r.resolve(ref);
            if (commitId == null) throw new IOException("Ref not found");
            try (RevWalk walk = new RevWalk(r)) {
                RevCommit commit = walk.parseCommit(commitId);
                try (TreeWalk tw = new TreeWalk(r)) {
                    tw.addTree(commit.getTree());
                    tw.setRecursive(false);
                    if (path != null && !path.isEmpty()) {
                        tw.setFilter(PathFilter.create(path));
                    }
                    List<Map<String, Object>> res = new ArrayList<>();
                    while (tw.next()) {
                        String p = tw.getPathString();
                        boolean isDir = tw.isSubtree();
                        if (path == null || path.isEmpty()) {
                            res.add(Map.of(
                                    "path", p,
                                    "type", isDir ? "tree" : "blob"
                            ));
                        } else if (p.startsWith(path + "/")) {
                            String rel = p.substring(path.length() + 1);
                            if (!rel.isEmpty() && !rel.contains("/")) {
                                res.add(Map.of(
                                        "path", p,
                                        "type", isDir ? "tree" : "blob"
                                ));
                            }
                        }
                    }
                    return res;
                }
            }
        }
    }

    public String fileContent(UUID repoId, String ref, String path) throws IOException {
        try (Repository r = openRepo(repoId)) {
            ObjectId objId = r.resolve(ref + ":" + path);
            if (objId == null) throw new IOException("File not found");
            return new String(r.open(objId).getBytes());
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
            Iterable<RevCommit> log = git.log().add(r.resolve(ref)).call();
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
            throw new IOException(e);
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
            git.checkout().setName(branch).call();
            
            Path filePath = config.getRepoPath(repoId.toString()).resolve(path);
            Files.createDirectories(filePath.getParent());
            Files.writeString(filePath, content);
            
            git.add().addFilepattern(path).call();
            git.commit()
                    .setMessage(message)
                    .setAuthor(author, author + "@example.com")
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to commit file: " + e.getMessage(), e);
        }
    }

    public void deleteFile(UUID repoId, String branch, String path, String message, String author) throws IOException {
        try (Repository r = openRepo(repoId); Git git = new Git(r)) {
            git.checkout().setName(branch).call();
            
            Path filePath = config.getRepoPath(repoId.toString()).resolve(path);
            Files.deleteIfExists(filePath);
            
            git.rm().addFilepattern(path).call();
            git.commit()
                    .setMessage(message)
                    .setAuthor(author, author + "@example.com")
                    .call();
        } catch (Exception e) {
            throw new IOException("Failed to delete file: " + e.getMessage(), e);
        }
    }
}


