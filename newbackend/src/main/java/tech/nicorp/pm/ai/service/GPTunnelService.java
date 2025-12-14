package tech.nicorp.pm.ai.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class GPTunnelService {
    private final RestTemplate restTemplate;
    private final String baseUrl;
    private final String apiKey;
    private final String model;

    public GPTunnelService(@Value("${gptunnel.base-url:https://gptunnel.com/v1}") String baseUrl,
                          @Value("${gptunnel.api-key:shds-Lq3Vw7K18HYtAZfAYWSKjpmBefh}") String apiKey,
                          @Value("${gptunnel.model:gpt-4o}") String model,
                          RestTemplate restTemplate) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.model = model;
        this.restTemplate = restTemplate;
    }

    public String chatCompletion(List<Map<String, String>> messages) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + apiKey);
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> request = new HashMap<>();
        request.put("model", model);
        request.put("messages", messages);
        request.put("temperature", 0.7);
        request.put("max_tokens", 2000);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
        ResponseEntity<Map> response = restTemplate.exchange(
            baseUrl + "/chat/completions",
            HttpMethod.POST,
            entity,
            Map.class
        );

        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null) {
            throw new RuntimeException("Empty response from GPTunnel");
        }

        List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
        if (choices == null || choices.isEmpty()) {
            throw new RuntimeException("No choices in GPTunnel response");
        }

        Map<String, Object> firstChoice = choices.get(0);
        Map<String, String> message = (Map<String, String>) firstChoice.get("message");
        if (message == null) {
            throw new RuntimeException("No message in GPTunnel response choice");
        }

        String content = message.get("content");
        if (content == null) {
            throw new RuntimeException("No content in GPTunnel response message");
        }

        return content;
    }
}
