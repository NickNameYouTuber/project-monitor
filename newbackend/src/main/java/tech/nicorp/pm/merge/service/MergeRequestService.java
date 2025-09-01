package tech.nicorp.pm.merge.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.api.Git;
import org.eclipse.jgit.api.MergeResult;
import org.eclipse.jgit.transport.RefSpec;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.git.GitConfig;
import tech.nicorp.pm.merge.domain.MergeRequest;
import tech.nicorp.pm.merge.domain.MergeRequestApproval;
import tech.nicorp.pm.merge.domain.MergeRequestStatus;
import tech.nicorp.pm.merge.repo.MergeRequestApprovalRepository;
import tech.nicorp.pm.merge.repo.MergeRequestRepository;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.security.SecurityUtil;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MergeRequestService {
    private final MergeRequestRepository mrs;
    private final MergeRequestApprovalRepository approvals;
    private final UserRepository users;
    private final EntityManager em;
    private final GitConfig gitConfig;

    @Transactional
    public MergeRequest create(UUID repoId, Map<String, String> body) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        User author = users.findById(userId).orElseThrow();
        Repository repoRef = em.getReference(Repository.class, repoId);
        MergeRequest mr = new MergeRequest();
        mr.setRepository(repoRef);
        mr.setAuthor(author);
        mr.setSourceBranch(body.get("source_branch"));
        mr.setTargetBranch(body.get("target_branch"));
        mr.setTitle(body.getOrDefault("title", mr.getSourceBranch() + " -> " + mr.getTargetBranch()));
        return mrs.save(mr);
    }

    public List<MergeRequest> list(UUID repoId) {
        return mrs.findByRepositoryIdOrderByCreatedAtDesc(repoId);
    }

    public MergeRequest detail(UUID repoId, UUID mrId) {
        return mrs.findById(mrId).orElseThrow();
    }

    @Transactional
    public void approve(UUID repoId, UUID mrId) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        MergeRequest mr = mrs.findById(mrId).orElseThrow();
        MergeRequestApproval app = new MergeRequestApproval();
        app.setMergeRequest(mr);
        app.setUser(users.findById(userId).orElseThrow());
        approvals.save(app);
    }

    @Transactional
    public void unapprove(UUID repoId, UUID mrId) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        approvals.deleteByMergeRequestIdAndUserId(mrId, userId);
    }

    @Transactional
    public MergeRequest merge(UUID repoId, UUID mrId) {
        MergeRequest mr = mrs.findById(mrId).orElseThrow();
        String source = mr.getSourceBranch();
        String target = mr.getTargetBranch();

        // Clone bare repo into temp workdir
        Path bare = gitConfig.getRepoPath(repoId.toString());
        Path tmpDir;
        try {
            tmpDir = Files.createTempDirectory("mr-merge-");
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
        try (Git git = Git.cloneRepository()
                .setURI(bare.toUri().toString())
                .setDirectory(tmpDir.toFile())
                .call()) {
            // checkout target
            git.checkout().setName(target).call();
            // merge source
            MergeResult result = git.merge().include(git.getRepository().findRef("refs/heads/" + source)).call();
            if (!result.getMergeStatus().isSuccessful()) {
                throw new RuntimeException("Merge conflict: " + result.getMergeStatus());
            }
            // push back to bare repo
            git.push().setRemote("origin").setRefSpecs(new RefSpec(target + ":refs/heads/" + target)).call();

            mr.setStatus(MergeRequestStatus.MERGED);
            return mrs.save(mr);
        } catch (Exception e) {
            throw new RuntimeException(e);
        } finally {
            // cleanup
            try {
                Files.walk(tmpDir)
                        .sorted((a, b) -> b.getNameCount() - a.getNameCount())
                        .forEach(p -> {
                            try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                        });
            } catch (Exception ignored) {}
        }
    }
}


