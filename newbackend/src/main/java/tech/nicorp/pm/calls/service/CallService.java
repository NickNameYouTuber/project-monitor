package tech.nicorp.pm.calls.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tech.nicorp.pm.users.domain.User;

@Service
public class CallService {

    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    public String createToken(User user, String roomName) {
        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setName(user.getDisplayName());
        token.setIdentity(user.getUsername());
        
        token.addGrants(new RoomJoin(true), new RoomName(roomName));
        
        // Default TTL is usually fine, or set explicitly
        // token.setTtl(...);

        return token.toJwt();
    }
}
