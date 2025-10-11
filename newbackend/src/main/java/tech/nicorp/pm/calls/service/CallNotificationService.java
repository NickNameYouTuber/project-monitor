package tech.nicorp.pm.calls.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallParticipant;
import tech.nicorp.pm.users.domain.User;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallNotificationService {

    private final RestTemplate restTemplate;
    
    @Value("${nimeet.backend.url:http://localhost:3001}")
    private String nimeetBackendUrl;

    public void notifyCallStarting(Call call) {
        if (call.getParticipants() == null || call.getParticipants().isEmpty()) {
            log.warn("⚠️ Звонок {} не имеет участников, уведомления не отправлены", call.getRoomId());
            return;
        }
        
        for (CallParticipant participant : call.getParticipants()) {
            User user = participant.getUser();
            if (user == null) continue;
            
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("userId", user.getId().toString());
                payload.put("callId", call.getId().toString());
                payload.put("title", call.getTitle());
                payload.put("roomId", call.getRoomId());
                
                String url = nimeetBackendUrl + "/api/notifications/call-starting";
                restTemplate.postForObject(url, payload, Map.class);
                
                log.info("✅ Уведомление о начале звонка отправлено пользователю {}", user.getUsername());
            } catch (Exception e) {
                log.error("❌ Ошибка отправки уведомления пользователю {}: {}", user.getUsername(), e.getMessage());
            }
        }
    }
    
    public void notifyCallReminder(Call call, int minutesUntil) {
        if (call.getParticipants() == null || call.getParticipants().isEmpty()) {
            return;
        }
        
        for (CallParticipant participant : call.getParticipants()) {
            User user = participant.getUser();
            if (user == null) continue;
            
            try {
                Map<String, Object> payload = new HashMap<>();
                payload.put("userId", user.getId().toString());
                payload.put("callId", call.getId().toString());
                payload.put("title", call.getTitle());
                payload.put("minutesUntil", minutesUntil);
                
                String url = nimeetBackendUrl + "/api/notifications/call-reminder";
                restTemplate.postForObject(url, payload, Map.class);
                
                log.info("✅ Напоминание о звонке отправлено пользователю {} (через {} мин)", user.getUsername(), minutesUntil);
            } catch (Exception e) {
                log.error("❌ Ошибка отправки напоминания пользователю {}: {}", user.getUsername(), e.getMessage());
            }
        }
    }
}

