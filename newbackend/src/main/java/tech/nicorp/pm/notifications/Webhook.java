package tech.nicorp.pm.notifications;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "webhooks")
@Getter
@Setter
@NoArgsConstructor
public class Webhook {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "url", nullable = false)
    private String url;

    @Column(name = "secret")
    private String secret;

    @Column(name = "events", nullable = false)
    private String events; // comma-separated: pipeline,mr

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}


