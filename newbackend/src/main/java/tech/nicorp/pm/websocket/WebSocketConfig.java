package tech.nicorp.pm.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {
    private final RealtimeWebSocketHandler realtimeHandler;
    private final CallNotificationWebSocketHandler callNotificationHandler;
    private final PipelineLogsWebSocketHandler pipelineLogsHandler;

    public WebSocketConfig(
            RealtimeWebSocketHandler realtimeHandler,
            CallNotificationWebSocketHandler callNotificationHandler,
            PipelineLogsWebSocketHandler pipelineLogsHandler) {
        this.realtimeHandler = realtimeHandler;
        this.callNotificationHandler = callNotificationHandler;
        this.pipelineLogsHandler = pipelineLogsHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(realtimeHandler, "/ws/realtime")
            .setAllowedOrigins("*");
        
        registry.addHandler(callNotificationHandler, "/ws/call-notifications")
            .setAllowedOrigins("*");
        
        registry.addHandler(pipelineLogsHandler, "/ws/pipeline-logs/{jobId}")
            .setAllowedOrigins("*");
    }
}
