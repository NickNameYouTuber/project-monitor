package tech.nicorp.pm.repositories.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "repository_members")
@Getter
@Setter
@NoArgsConstructor
public class RepositoryMember {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "role", nullable = false)
    private String role;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    public RepositoryRole getRoleEnum() {
        try {
            return RepositoryRole.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            if ("owner".equalsIgnoreCase(role)) return RepositoryRole.OWNER;
            if ("developer".equalsIgnoreCase(role)) return RepositoryRole.DEVELOPER;
            if ("maintainer".equalsIgnoreCase(role)) return RepositoryRole.MAINTAINER;
            if ("reporter".equalsIgnoreCase(role)) return RepositoryRole.REPORTER;
            return RepositoryRole.VIEWER;
        }
    }

    public void setRoleEnum(RepositoryRole repositoryRole) {
        this.role = repositoryRole.name();
    }
}


