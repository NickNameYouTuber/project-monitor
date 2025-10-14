package tech.nicorp.pm.organizations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organizations")
@Getter
@Setter
@NoArgsConstructor
public class Organization {
    
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "name", nullable = false, length = 200)
    private String name;

    @Column(name = "slug", nullable = false, unique = true, length = 100)
    private String slug;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @Column(name = "require_password")
    private Boolean requirePassword = false;

    @Column(name = "password_hash", columnDefinition = "text")
    private String passwordHash;

    @Column(name = "corporate_domain", length = 255)
    private String corporateDomain;

    @Column(name = "require_corporate_email")
    private Boolean requireCorporateEmail = false;

    @Column(name = "logo_url", columnDefinition = "text")
    private String logoUrl;

    @Column(name = "website", length = 500)
    private String website;

    @Column(name = "default_project_role", length = 32)
    private String defaultProjectRole = "DEVELOPER";

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}

