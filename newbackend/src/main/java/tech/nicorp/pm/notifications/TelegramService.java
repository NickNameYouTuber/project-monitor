package tech.nicorp.pm.notifications;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class TelegramService {
    private final String botToken;
    private final String defaultChatId;
    private final HttpClient client = HttpClient.newHttpClient();

    public TelegramService(
            @Value("${notifications.telegram.botToken:}") String botToken,
            @Value("${notifications.telegram.defaultChatId:}") String defaultChatId
    ) {
        this.botToken = botToken;
        this.defaultChatId = defaultChatId;
    }

    public void sendMessage(String chatId, String text) {
        if (botToken == null || botToken.isBlank()) return;
        String targetChat = (chatId == null || chatId.isBlank()) ? defaultChatId : chatId;
        if (targetChat == null || targetChat.isBlank()) return;
        try {
            String encoded = URLEncoder.encode(text, StandardCharsets.UTF_8);
            URI uri = URI.create("https://api.telegram.org/bot" + botToken + "/sendMessage?chat_id=" + targetChat + "&text=" + encoded);
            HttpRequest req = HttpRequest.newBuilder(uri).GET().build();
            client.send(req, HttpResponse.BodyHandlers.discarding());
        } catch (Exception ignored) {}
    }
}


