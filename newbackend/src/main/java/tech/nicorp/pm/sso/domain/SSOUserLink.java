package tech.nicorp.pm.sso.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sso_user_links")
@Getter
@Setter
public class SSOUserLink {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;
    
    @Column(name = "sso_provider_id", nullable = false)
    private String ssoProviderId;
    
    @Column(name = "sso_email", nullable = false)
    private String ssoEmail;
    
    @Column(name = "linked_at")
    private OffsetDateTime linkedAt = OffsetDateTime.now();
    
    @Column(name = "last_login_at")
    private OffsetDateTime lastLoginAt;
}

