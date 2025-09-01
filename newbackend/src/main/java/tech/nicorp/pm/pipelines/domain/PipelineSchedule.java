package tech.nicorp.pm.pipelines.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pipeline_schedules")
@Getter
@Setter
@NoArgsConstructor
public class PipelineSchedule {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "repository_id", columnDefinition = "uuid", nullable = false)
    private UUID repositoryId;

    @Column(name = "cron", nullable = false)
    private String cron;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}


