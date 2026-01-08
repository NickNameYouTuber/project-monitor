package tech.nicorp.pm.ai.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "chat_messages")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;

    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "content", columnDefinition = "text", nullable = false)
    private String content;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "actions", columnDefinition = "jsonb")
    private String actions;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "widgets", columnDefinition = "jsonb")
    private String widgets;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}
