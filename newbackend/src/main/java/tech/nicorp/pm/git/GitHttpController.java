package tech.nicorp.pm.git;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.http.server.GitServlet;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.transport.resolver.RepositoryResolver;
import org.eclipse.jgit.transport.resolver.ServiceNotAuthorizedException;
import org.eclipse.jgit.transport.resolver.ServiceNotEnabledException;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

import java.io.IOException;
import java.util.UUID;

@Controller
@RequestMapping("/git")
@RequiredArgsConstructor
public class GitHttpController {
    private final GitConfig config;
    
    private final GitServlet gitServlet = new GitServlet();
    
    {
        gitServlet.setRepositoryResolver(new RepositoryResolver<HttpServletRequest>() {
            @Override
            public Repository open(HttpServletRequest req, String name) throws ServiceNotAuthorizedException, ServiceNotEnabledException {
                try {
                    String repoId = name.replace(".git", "");
                    return new org.eclipse.jgit.storage.file.FileRepositoryBuilder()
                            .setGitDir(config.getRepoPath(repoId).toFile())
                            .build();
                } catch (Exception e) {
                    throw new ServiceNotEnabledException(e.getMessage(), e);
                }
            }
        });
    }
    
    @RequestMapping("/**")
    public void handleGitRequest(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
        gitServlet.service(request, response);
    }
}

