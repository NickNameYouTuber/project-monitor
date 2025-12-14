package tech.nicorp.pm.calls.api;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import tech.nicorp.pm.websocket.WebSocketSessionManager;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CallNotificationController {
    
    private final WebSocketSessionManager sessionManager;
    
    public void sendCallStarting(UUID userId, String callId, String title, String roomId) {
        log.info("Sending call-starting notification to user {}", userId);
        Map<String, Object> data = Map.of(
            "callId", callId,
            "title", title,
            "roomId", roomId
        );
        sessionManager.sendCallNotificationToUser(userId, "call-starting", data);
    }
    
    public void sendCallReminder(UUID userId, String callId, String title, int minutesUntil) {
        log.info("Sending call-reminder notification to user {}", userId);
        Map<String, Object> data = Map.of(
            "callId", callId,
            "title", title,
            "minutesUntil", minutesUntil
        );
        sessionManager.sendCallNotificationToUser(userId, "call-reminder", data);
    }
}

