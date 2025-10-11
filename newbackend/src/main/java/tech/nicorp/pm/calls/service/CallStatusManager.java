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
    private final CallNotificationService notificationService;
    
    private final java.util.concurrent.ConcurrentHashMap<UUID, Boolean> sentReminders = new java.util.concurrent.ConcurrentHashMap<>();

    /**
     * Обновление статусов звонков каждую минуту
     */
    @Scheduled(fixedRate = 60000) // 60 секунд
    public void updateCallStatuses() {
        log.debug("🔄 Запуск автоматического обновления статусов звонков");
        
        try {
            sendUpcomingCallReminders();
            activateScheduledCalls();
            completeActiveCalls();
        } catch (Exception e) {
            log.error("❌ Ошибка при обновлении статусов звонков", e);
        }
    }

    /**
     * Отправка напоминаний за 5 минут до начала звонка
     */
    private void sendUpcomingCallReminders() {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime reminderStart = now.plusMinutes(4);
        OffsetDateTime reminderEnd = now.plusMinutes(6);
        
        List<Call> upcomingCalls = callRepository.findByStatusAndScheduledTimeBetween(
            CallStatus.SCHEDULED,
            reminderStart,
            reminderEnd
        );
        
        for (Call call : upcomingCalls) {
            if (sentReminders.containsKey(call.getId())) {
                continue;
            }
            
            long minutesUntil = java.time.Duration.between(now, call.getScheduledTime()).toMinutes();
            notificationService.notifyCallReminder(call, (int) minutesUntil);
            
            sentReminders.put(call.getId(), true);
            log.info("📢 Отправлено напоминание о звонке {} (через {} минут)", call.getTitle(), minutesUntil);
        }
        
        cleanupOldReminders();
    }
    
    private void cleanupOldReminders() {
        OffsetDateTime cutoff = OffsetDateTime.now().minusHours(1);
        sentReminders.entrySet().removeIf(entry -> {
            try {
                Call call = callRepository.findById(entry.getKey()).orElse(null);
                return call == null || call.getScheduledTime().isBefore(cutoff);
            } catch (Exception e) {
                return true;
            }
        });
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
            call.setStatus(CallStatus.ACTIVE);
            callRepository.save(call);
            log.info("✅ Call {} автоматически активирован: {}", call.getId(), call.getTitle());
            
            notificationService.notifyCallStarting(call);
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

