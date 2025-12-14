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
    private final tech.nicorp.pm.calls.api.CallNotificationController callNotificationController;
    
    @Value("${nimeet.backend.url:http://localhost:3001}")
    private String nimeetBackendUrl;

    public void notifyCallStarting(Call call) {
        log.info("🔔 Попытка отправки уведомлений о начале звонка: callId={}, title={}, roomId={}", 
            call.getId(), call.getTitle(), call.getRoomId());
        
        if (call.getParticipants() == null || call.getParticipants().isEmpty()) {
            log.warn("⚠️ Звонок {} не имеет участников, уведомления не отправлены", call.getRoomId());
            return;
        }
        
        log.info("👥 Участников звонка: {}", call.getParticipants().size());
        
        for (CallParticipant participant : call.getParticipants()) {
            User user = participant.getUser();
            if (user == null) {
                log.warn("⚠️ Участник без пользователя, пропускаем");
                continue;
            }
            
            try {
                callNotificationController.sendCallStarting(
                    user.getId(),
                    call.getId().toString(),
                    call.getTitle(),
                    call.getRoomId()
                );
                
                log.info("✅ WebSocket уведомление о начале звонка отправлено пользователю {} (userId={})", 
                    user.getUsername(), user.getId());
            } catch (Exception e) {
                log.error("❌ Ошибка отправки уведомления пользователю {}: {}", user.getUsername(), e.getMessage(), e);
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
                callNotificationController.sendCallReminder(
                    user.getId(),
                    call.getId().toString(),
                    call.getTitle(),
                    minutesUntil
                );
                
                log.info("✅ WebSocket напоминание о звонке отправлено пользователю {} (через {} мин)", user.getUsername(), minutesUntil);
            } catch (Exception e) {
                log.error("❌ Ошибка отправки напоминания пользователю {}: {}", user.getUsername(), e.getMessage());
            }
        }
    }
}

