package tech.nicorp.pm.git;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import java.nio.file.Path;

@Configuration
public class GitConfig {
    @Value("${git.repos.root:/git-repos}")
    private String reposRoot;

    public Path getRepoPath(String repoId) {
        return Path.of(reposRoot).resolve(repoId);
    }
}


