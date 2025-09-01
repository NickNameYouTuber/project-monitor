package tech.nicorp.pm.pipelines.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "pipeline_jobs")
@Getter
@Setter
@NoArgsConstructor
public class PipelineJob {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pipeline_id", nullable = false)
    private Pipeline pipeline;

    @Column(nullable = false)
    private String name;

    @Column(name = "image")
    private String image;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private JobStatus status = JobStatus.QUEUED;

    @Enumerated(EnumType.STRING)
    @Column(name = "when_type", nullable = false)
    private WhenType whenType = WhenType.ON_SUCCESS;

    @Column(name = "is_manual", nullable = false)
    private boolean isManual = false;

    @Column(name = "allow_failure", nullable = false)
    private boolean allowFailure = false;

    @Column(name = "start_after_seconds")
    private Integer startAfterSeconds;

    @Column(name = "rule_hint")
    private String ruleHint;

    @Column(name = "manual_released", nullable = false)
    private boolean manualReleased = false;

    @Column(name = "timeout_seconds")
    private Integer timeoutSeconds;

    @Column(name = "env_json", columnDefinition = "text")
    private String envJson;

    @Column(name = "script", columnDefinition = "text")
    private String script;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;
}


