package tech.nicorp.pm.sso.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import tech.nicorp.pm.organizations.domain.Organization;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "sso_states")
@Getter
@Setter
public class SSOState {
    
    @Id
    @Column(length = 255)
    private String state;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;
    
    @Column(name = "code_verifier")
    private String codeVerifier;
    
    @Column(name = "redirect_uri", length = 500)
    private String redirectUri;
    
    @Column(name = "created_at")
    private OffsetDateTime createdAt = OffsetDateTime.now();
    
    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}

