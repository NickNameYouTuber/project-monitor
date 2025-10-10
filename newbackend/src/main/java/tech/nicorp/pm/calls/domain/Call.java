package tech.nicorp.pm.calls.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "calls")
@Getter
@Setter
@NoArgsConstructor
public class Call {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "room_id", nullable = false, unique = true, length = 100)
    private String roomId;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", columnDefinition = "text")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private tech.nicorp.pm.tasks.domain.Task task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "start_at")
    private OffsetDateTime startAt;

    @Column(name = "end_at")
    private OffsetDateTime endAt;

    @Column(name = "scheduled_time")
    private OffsetDateTime scheduledTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20)
    private CallStatus status = CallStatus.SCHEDULED;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @OneToMany(mappedBy = "call", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<CallParticipant> participants = new ArrayList<>();

    public void addParticipant(User user, ParticipantRole role) {
        CallParticipant participant = new CallParticipant();
        participant.setCall(this);
        participant.setUser(user);
        participant.setRole(role);
        participants.add(participant);
    }
}


