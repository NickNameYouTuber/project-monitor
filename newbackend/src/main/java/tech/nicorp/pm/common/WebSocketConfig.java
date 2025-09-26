package tech.nicorp.pm.common;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;
import tech.nicorp.pm.common.signaling.SignalingWebSocketHandler;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final SignalingWebSocketHandler signalingWebSocketHandler;

    public WebSocketConfig(SignalingWebSocketHandler signalingWebSocketHandler) {
        this.signalingWebSocketHandler = signalingWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(signalingWebSocketHandler, "/ws/signaling")
                .addInterceptors(new HttpSessionHandshakeInterceptor())
                .setAllowedOrigins("*");
    }
}


