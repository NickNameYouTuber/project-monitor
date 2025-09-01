package tech.nicorp.pm.notifications;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WebhookService {
    private final WebhookRepository repo;
    private final ObjectMapper mapper = new ObjectMapper();
    private final HttpClient client = HttpClient.newHttpClient();

    public void emit(String event, Map<String, Object> payload) {
        List<Webhook> hooks = repo.findAll();
        for (Webhook h : hooks) {
            if (!List.of(h.getEvents().split(",")).contains(event)) continue;
            try {
                byte[] body = mapper.writeValueAsBytes(payload);
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(h.getUrl()))
                        .header("Content-Type", "application/json")
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body))
                        .build();
                client.send(req, HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) {}
        }
    }
}


