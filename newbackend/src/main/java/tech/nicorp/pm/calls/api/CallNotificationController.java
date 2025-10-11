package tech.nicorp.pm.calls.api;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/call-notifications")
@RequiredArgsConstructor
public class CallNotificationController {
    
    private static final Map<UUID, SseEmitter> emitters = new ConcurrentHashMap<>();
    private static final ScheduledExecutorService heartbeatExecutor = Executors.newSingleThreadScheduledExecutor();
    
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @Operation(summary = "SSE stream для уведомлений о звонках")
    public SseEmitter streamNotifications(@AuthenticationPrincipal Object principal) {
        log.info("🔍 DEBUG SSE: principal = {}, type = {}", principal, principal != null ? principal.getClass().getName() : "null");
        
        UUID userId = extractUserId(principal);
        log.info("🔍 DEBUG SSE: extracted userId = {}", userId);
        
        if (userId == null) {
            log.warn("⚠️ Попытка подключения к SSE без авторизации, principal was: {}", principal);
            SseEmitter emitter = new SseEmitter(0L);
            emitter.completeWithError(new IllegalStateException("Unauthorized"));
            return emitter;
        }
        
        log.info("📡 SSE подключение от пользователя: {}", userId);
        
        SseEmitter emitter = new SseEmitter(0L);
        emitters.put(userId, emitter);
        
        emitter.onCompletion(() -> {
            log.info("📡 SSE отключен: {}", userId);
            emitters.remove(userId);
        });
        
        emitter.onTimeout(() -> {
            log.info("📡 SSE таймаут: {}", userId);
            emitters.remove(userId);
        });
        
        emitter.onError((e) -> {
            log.error("📡 SSE ошибка: {}", userId, e);
            emitters.remove(userId);
        });
        
        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .data(Map.of("message", "Connected to call notifications")));
        } catch (IOException e) {
            log.error("Ошибка отправки connected", e);
            emitters.remove(userId);
            return emitter;
        }
        
        heartbeatExecutor.scheduleAtFixedRate(() -> {
            if (emitters.containsKey(userId)) {
                try {
                    emitter.send(SseEmitter.event()
                        .comment("heartbeat"));
                    log.debug("💓 Heartbeat отправлен пользователю: {}", userId);
                } catch (IOException e) {
                    log.warn("💔 Heartbeat failed для пользователя: {}", userId);
                    emitters.remove(userId);
                }
            }
        }, 15, 15, TimeUnit.SECONDS);
        
        return emitter;
    }
    
    public static void sendCallStarting(UUID userId, String callId, String title, String roomId) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            log.warn("⚠️ Нет SSE подключения для пользователя {} (всего подключений: {})", userId, emitters.size());
            log.info("📋 Список подключенных пользователей: {}", emitters.keySet());
            return;
        }
        
        try {
            emitter.send(SseEmitter.event()
                .name("call-starting")
                .data(Map.of(
                    "callId", callId,
                    "title", title,
                    "roomId", roomId
                )));
            log.info("✅ SSE уведомление отправлено пользователю {}", userId);
        } catch (IOException e) {
            log.error("❌ Ошибка отправки SSE уведомления пользователю {}", userId, e);
            emitters.remove(userId);
        }
    }
    
    public static void sendCallReminder(UUID userId, String callId, String title, int minutesUntil) {
        SseEmitter emitter = emitters.get(userId);
        if (emitter == null) {
            log.warn("⚠️ Нет SSE подключения для пользователя {} (всего подключений: {})", userId, emitters.size());
            log.info("📋 Список подключенных пользователей: {}", emitters.keySet());
            return;
        }
        
        try {
            emitter.send(SseEmitter.event()
                .name("call-reminder")
                .data(Map.of(
                    "callId", callId,
                    "title", title,
                    "minutesUntil", minutesUntil
                )));
            log.info("✅ SSE напоминание отправлено пользователю {}", userId);
        } catch (IOException e) {
            log.error("❌ Ошибка отправки SSE напоминания пользователю {}", userId, e);
            emitters.remove(userId);
        }
    }
    
    private UUID extractUserId(Object principal) {
        if (principal == null) {
            return null;
        }
        
        if (principal instanceof String) {
            try {
                return UUID.fromString((String) principal);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        
        return null;
    }
}

