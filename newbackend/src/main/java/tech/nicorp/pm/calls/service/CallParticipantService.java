package tech.nicorp.pm.calls.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallParticipant;
import tech.nicorp.pm.calls.domain.ParticipantRole;
import tech.nicorp.pm.calls.domain.ParticipantStatus;
import tech.nicorp.pm.calls.repo.CallRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallParticipantService {

    private final CallRepository callRepository;
    private final UserRepository userRepository;

    /**
     * Добавить участников при создании звонка
     * Автоматически добавляет создателя как ORGANIZER
     */
    @Transactional
    public void addParticipantsToCall(Call call, List<UUID> userIds, User creator) {
        log.info("Добавление участников к звонку {}: creator={}, participants={}", 
            call.getId(), creator.getId(), userIds);
        
        // 1. Добавить создателя как ORGANIZER
        addParticipantToCall(call, creator, ParticipantRole.ORGANIZER);
        
        // 2. Добавить остальных участников как PARTICIPANT
        if (userIds != null && !userIds.isEmpty()) {
            for (UUID userId : userIds) {
                // Пропускаем создателя (уже добавлен)
                if (userId.equals(creator.getId())) {
                    continue;
                }
                
                userRepository.findById(userId).ifPresent(user -> {
                    addParticipantToCall(call, user, ParticipantRole.PARTICIPANT);
                });
            }
        }
        
        callRepository.save(call);
        log.info("✅ Добавлено {} участников к звонку {}", call.getParticipants().size(), call.getId());
    }

    /**
     * Добавить одного участника к звонку
     */
    @Transactional
    public CallParticipant addParticipant(UUID callId, UUID userId, ParticipantRole role) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));
        
        // Проверка что участник еще не добавлен
        boolean alreadyExists = call.getParticipants().stream()
            .anyMatch(p -> p.getUser().getId().equals(userId));
        
        if (alreadyExists) {
            throw new IllegalStateException("User already participant of this call");
        }
        
        CallParticipant participant = addParticipantToCall(call, user, role);
        callRepository.save(call);
        
        log.info("➕ Добавлен участник {} к звонку {} с ролью {}", userId, callId, role);
        return participant;
    }

    /**
     * Удалить участника из звонка
     */
    @Transactional
    public void removeParticipant(UUID callId, UUID userId) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        call.getParticipants().removeIf(p -> p.getUser().getId().equals(userId));
        callRepository.save(call);
        
        log.info("➖ Удален участник {} из звонка {}", userId, callId);
    }

    /**
     * Получить участников звонка
     */
    public List<CallParticipant> getParticipants(UUID callId) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        return call.getParticipants();
    }

    /**
     * Проверить доступ пользователя к звонку
     */
    public boolean hasAccess(UUID callId, UUID userId) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        return call.getParticipants().stream()
            .anyMatch(p -> p.getUser().getId().equals(userId));
    }

    /**
     * Получить роль пользователя в звонке
     */
    public Optional<ParticipantRole> getUserRole(UUID callId, UUID userId) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        return call.getParticipants().stream()
            .filter(p -> p.getUser().getId().equals(userId))
            .map(CallParticipant::getRole)
            .findFirst();
    }

    /**
     * Обновить статус участника
     */
    @Transactional
    public void updateStatus(UUID callId, UUID userId, ParticipantStatus newStatus) {
        Call call = callRepository.findById(callId)
            .orElseThrow(() -> new IllegalArgumentException("Call not found: " + callId));
        
        CallParticipant participant = call.getParticipants().stream()
            .filter(p -> p.getUser().getId().equals(userId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Participant not found"));
        
        participant.setStatus(newStatus);
        
        // Устанавливаем timestamp в зависимости от статуса
        switch (newStatus) {
            case JOINED -> participant.setJoinedAt(OffsetDateTime.now());
            case LEFT -> participant.setLeftAt(OffsetDateTime.now());
        }
        
        callRepository.save(call);
        log.info("📝 Статус участника {} в звонке {} изменен на {}", userId, callId, newStatus);
    }

    /**
     * Внутренний метод для добавления участника
     */
    private CallParticipant addParticipantToCall(Call call, User user, ParticipantRole role) {
        CallParticipant participant = new CallParticipant();
        participant.setCall(call);
        participant.setUser(user);
        participant.setRole(role);
        participant.setStatus(ParticipantStatus.INVITED);
        participant.setInvitedAt(OffsetDateTime.now());
        
        call.getParticipants().add(participant);
        return participant;
    }
}

