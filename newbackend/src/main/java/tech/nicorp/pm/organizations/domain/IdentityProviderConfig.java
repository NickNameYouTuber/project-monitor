package tech.nicorp.pm.organizations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "identity_provider_configs")
@Getter
@Setter
public class IdentityProviderConfig {
    @Id
    @GeneratedValue
    private UUID id;
    
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false, unique = true)
    private Organization organization;
    
    @Column(name = "enabled")
    private Boolean enabled = false;
    
    @Column(name = "provider_name")
    private String providerName;
    
    @Column(name = "api_key", unique = true)
    private String apiKey;
    
    @Column(name = "api_secret", columnDefinition = "TEXT")
    private String apiSecret;
    
    @Column(name = "webhook_url", length = 500)
    private String webhookUrl;
    
    @Column(name = "allowed_domains", columnDefinition = "TEXT")
    private String allowedDomains;
    
    @Column(name = "require_email_verification")
    private Boolean requireEmailVerification = true;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt;
    
    @Column(name = "updated_at")
    private OffsetDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = OffsetDateTime.now();
        updatedAt = OffsetDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = OffsetDateTime.now();
    }
}

