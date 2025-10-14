package tech.nicorp.pm.sso.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tech.nicorp.pm.organizations.domain.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sso_configurations")
@Getter
@Setter
public class SSOConfiguration {
    
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false)
    private SSOProviderType providerType = SSOProviderType.OIDC;
    
    @Column(name = "enabled")
    private Boolean enabled = false;
    
    @Column(name = "client_id")
    private String clientId;
    
    @Column(name = "client_secret_encrypted", columnDefinition = "TEXT")
    private String clientSecretEncrypted;
    
    @Column(name = "authorization_endpoint", length = 500)
    private String authorizationEndpoint;
    
    @Column(name = "token_endpoint", length = 500)
    private String tokenEndpoint;
    
    @Column(name = "userinfo_endpoint", length = 500)
    private String userinfoEndpoint;
    
    @Column(name = "issuer", length = 500)
    private String issuer;
    
    @Column(name = "jwks_uri", length = 500)
    private String jwksUri;
    
    @Column(name = "email_claim", length = 100)
    private String emailClaim = "email";
    
    @Column(name = "name_claim", length = 100)
    private String nameClaim = "name";
    
    @Column(name = "sub_claim", length = 100)
    private String subClaim = "sub";
    
    @Column(name = "scopes", columnDefinition = "TEXT")
    private String scopes = "openid,profile,email";
    
    @Column(name = "require_sso")
    private Boolean requireSSO = false;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt = OffsetDateTime.now();
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = OffsetDateTime.now();
    }
}

