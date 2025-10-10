package tech.nicorp.pm.calls.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallStatus;
import tech.nicorp.pm.calls.repo.CallRepository;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Автоматическое управление статусами звонков
 * Выполняется каждую минуту через Spring @Scheduled
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CallStatusManager {

    private final CallRepository callRepository;

    /**
     * Обновление статусов звонков каждую минуту
     */
    @Scheduled(fixedRate = 60000) // 60 секунд
    public void updateCallStatuses() {
        log.debug("🔄 Запуск автоматического обновления статусов звонков");
        
        try {
            activateScheduledCalls();
            completeActiveCalls();
        } catch (Exception e) {
            log.error("❌ Ошибка при обновлении статусов звонков", e);
        }
    }

    /**
     * SCHEDULED → ACTIVE (если время начала наступило)
     */
    private void activateScheduledCalls() {
        OffsetDateTime now = OffsetDateTime.now();
        
        List<Call> toActivate = callRepository.findByStatusAndScheduledTimeBefore(
            CallStatus.SCHEDULED,
            now
        );
        
        for (Call call : toActivate) {
            // Автоматически активируем если время наступило
            // Проверка наличия участников опциональна - звонок активируется по времени
            call.setStatus(CallStatus.ACTIVE);
            callRepository.save(call);
            log.info("✅ Call {} автоматически активирован: {}", call.getId(), call.getTitle());
        }
        
        if (toActivate.size() > 0) {
            log.info("🔵 Активировано звонков: {}", toActivate.size());
        }
    }

    /**
     * ACTIVE → COMPLETED (если прошло endAt + 5 минут grace period)
     */
    private void completeActiveCalls() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime gracePeriod = now.minusMinutes(5);
        
        List<Call> toComplete = callRepository.findByStatusAndEndAtBefore(
            CallStatus.ACTIVE,
            gracePeriod
        );
        
        for (Call call : toComplete) {
            call.setStatus(CallStatus.COMPLETED);
            callRepository.save(call);
            log.info("✅ Call {} автоматически завершен: {}", call.getId(), call.getTitle());
        }
        
        if (toComplete.size() > 0) {
            log.info("🟡 Завершено звонков: {}", toComplete.size());
        }
    }

    /**
     * Проверка разрешенных переходов статусов
     */
    public boolean isTransitionAllowed(CallStatus from, CallStatus to) {
        return switch (from) {
            case SCHEDULED -> to == CallStatus.ACTIVE || to == CallStatus.CANCELLED;
            case ACTIVE -> to == CallStatus.COMPLETED || to == CallStatus.CANCELLED;
            case COMPLETED, CANCELLED -> false; // Финальные состояния
        };
    }

    /**
     * Валидация и обновление статуса
     */
    public void updateStatus(Call call, CallStatus newStatus) {
        CallStatus currentStatus = call.getStatus();
        
        if (!isTransitionAllowed(currentStatus, newStatus)) {
            throw new IllegalStateException(
                String.format("Недопустимый переход статуса: %s → %s", currentStatus, newStatus)
            );
        }
        
        call.setStatus(newStatus);
        callRepository.save(call);
        log.info("📝 Статус звонка {} изменен: {} → {}", call.getId(), currentStatus, newStatus);
    }
}

