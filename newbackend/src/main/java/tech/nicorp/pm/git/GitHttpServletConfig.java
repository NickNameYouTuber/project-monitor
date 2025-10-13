package tech.nicorp.pm.git;

import jakarta.servlet.ServletException;
import lombok.RequiredArgsConstructor;
import org.eclipse.jgit.http.server.GitServlet;
import org.eclipse.jgit.lib.Repository;
import org.eclipse.jgit.storage.file.FileRepositoryBuilder;
import org.eclipse.jgit.transport.resolver.RepositoryResolver;
import org.eclipse.jgit.transport.resolver.ServiceNotAuthorizedException;
import org.eclipse.jgit.transport.resolver.ServiceNotEnabledException;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;

@Configuration
@RequiredArgsConstructor
public class GitHttpServletConfig {
    private final GitConfig config;
    
    @Bean
    public ServletRegistrationBean<GitServlet> gitServletRegistration() throws ServletException {
        GitServlet gitServlet = new GitServlet();
        
        gitServlet.setRepositoryResolver((RepositoryResolver<Object>) (req, name) -> {
            try {
                String repoId = name.replace(".git", "");
                return new FileRepositoryBuilder()
                        .setGitDir(config.getRepoPath(repoId).toFile())
                        .build();
            } catch (IOException e) {
                throw new ServiceNotEnabledException(e.getMessage(), e);
            }
        });
        
        gitServlet.setReceivePackEnabled(true);
        gitServlet.setUploadPackEnabled(true);
        
        ServletRegistrationBean<GitServlet> registration = new ServletRegistrationBean<>(gitServlet, "/git/*");
        registration.setLoadOnStartup(1);
        return registration;
    }
}

