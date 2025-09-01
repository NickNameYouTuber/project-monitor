package tech.nicorp.pm.git;

import org.eclipse.jgit.http.server.GitServlet;
import org.eclipse.jgit.lib.Config;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.transport.PostReceiveHook;
import org.eclipse.jgit.transport.ReceiveCommand;
import org.eclipse.jgit.transport.ReceivePack;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tech.nicorp.pm.pipelines.domain.PipelineSource;
import tech.nicorp.pm.pipelines.service.PipelineService;
import tech.nicorp.pm.git.GitService;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.List;
import java.util.UUID;

@Configuration
public class GitHttpConfig {

    private final GitConfig gitConfig;

    private final PipelineService pipelineService;
    private final GitService gitService;

    public GitHttpConfig(GitConfig gitConfig, PipelineService pipelineService, GitService gitService) {
        this.gitConfig = gitConfig;
        this.pipelineService = pipelineService;
        this.gitService = gitService;
    }

    @Bean
    public ServletRegistrationBean<GitServlet> gitServlet() {
        GitServlet servlet = new GitServlet();
        servlet.setRepositoryResolver((req, name) -> {
            // name like "/api/git/{repoId}.git"
            String repoId = name;
            if (repoId.endsWith(".git")) repoId = repoId.substring(0, repoId.length() - 4);
            Path gitDir = gitConfig.getRepoPath(repoId);
            if (!Files.exists(gitDir)) {
                throw new IOException("Repository not found");
            }
            Repository repository = new FileRepositoryBuilder().setGitDir(gitDir.toFile()).build();
            // enable receive-pack and upload-pack
            Config cfg = repository.getConfig();
            cfg.setBoolean("http", null, "receivepack", true);
            cfg.setBoolean("http", null, "uploadpack", true);
            cfg.save();
            ReceivePack rp = new ReceivePack(repository);
            rp.setPostReceiveHook(new PostReceiveHook() {
                @Override
                public void onPostReceive(ReceivePack rp, List<ReceiveCommand> commands) {
                    // trigger pipeline per updated ref
                    for (ReceiveCommand cmd : commands) {
                        if (cmd.getType() == ReceiveCommand.Type.UPDATE || cmd.getType() == ReceiveCommand.Type.CREATE) {
                            try {
                                UUID id = UUID.fromString(repoId);
                                String ref = cmd.getRefName().replace("refs/heads/", "");
                                String oldSha = cmd.getOldId() != null ? cmd.getOldId().getName() : null;
                                String newSha = cmd.getNewId() != null ? cmd.getNewId().getName() : null;
                                var changed = gitService.listChangedPaths(id, oldSha, newSha);
                                pipelineService.trigger(Map.of(
                                        "repository_id", id.toString(),
                                        "ref", ref,
                                        "commit_sha", newSha,
                                        "source", PipelineSource.PUSH.name(),
                                        "changed_paths", String.join(" ", changed)
                                ));
                            } catch (Exception ignored) {}
                        }
                    }
                }
            });
            servlet.setReceivePackFactory((httpServletRequest, repository1) -> rp);
            return repository;
        });
        ServletRegistrationBean<GitServlet> bean = new ServletRegistrationBean<>(servlet, "/api/git/*");
        bean.setName("GitServlet");
        return bean;
    }
}


