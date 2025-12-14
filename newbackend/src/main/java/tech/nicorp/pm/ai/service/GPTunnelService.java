package tech.nicorp.pm.ai.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
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
        log.info("GPTunnelService initialized with baseUrl: {}, model: {}", baseUrl, model);
    }

    public String chatCompletion(List<Map<String, String>> messages) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "Bearer " + apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> request = new HashMap<>();
            request.put("model", model);
            request.put("messages", messages);
            request.put("temperature", 0.7);
            request.put("max_tokens", 2000);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            log.debug("Sending request to GPTunnel: {}", baseUrl + "/chat/completions");
            
            ResponseEntity<Map> response = restTemplate.exchange(
                baseUrl + "/chat/completions",
                HttpMethod.POST,
                entity,
                Map.class
            );

            Map<String, Object> responseBody = response.getBody();
            if (responseBody == null) {
                log.error("Empty response body from GPTunnel");
                throw new RuntimeException("Empty response from GPTunnel");
            }

            if (responseBody.containsKey("error")) {
                Object errorObj = responseBody.get("error");
                String errorMsg = errorObj instanceof Map ? ((Map<?, ?>) errorObj).get("message").toString() : errorObj.toString();
                log.error("GPTunnel API error: {}", errorMsg);
                throw new RuntimeException("GPTunnel API error: " + errorMsg);
            }

            List<Map<String, Object>> choices = (List<Map<String, Object>>) responseBody.get("choices");
            if (choices == null || choices.isEmpty()) {
                log.error("No choices in GPTunnel response: {}", responseBody);
                throw new RuntimeException("No choices in GPTunnel response");
            }

            Map<String, Object> firstChoice = choices.get(0);
            Object messageObj = firstChoice.get("message");
            if (messageObj == null) {
                log.error("No message in GPTunnel response choice: {}", firstChoice);
                throw new RuntimeException("No message in GPTunnel response choice");
            }

            if (!(messageObj instanceof Map)) {
                log.error("Message is not a Map: {}", messageObj);
                throw new RuntimeException("Invalid message format in GPTunnel response");
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> message = (Map<String, Object>) messageObj;
            Object contentObj = message.get("content");
            if (contentObj == null) {
                log.error("No content in GPTunnel response message: {}", message);
                throw new RuntimeException("No content in GPTunnel response message");
            }

            String content = contentObj.toString();
            log.debug("Received response from GPTunnel, length: {}", content.length());
            return content;
        } catch (HttpClientErrorException e) {
            log.error("HTTP client error calling GPTunnel: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("GPTunnel API client error: " + e.getMessage(), e);
        } catch (HttpServerErrorException e) {
            log.error("HTTP server error calling GPTunnel: {} - {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("GPTunnel API server error: " + e.getMessage(), e);
        } catch (RestClientException e) {
            log.error("Rest client error calling GPTunnel: {}", e.getMessage(), e);
            throw new RuntimeException("GPTunnel API connection error: " + e.getMessage(), e);
        } catch (Exception e) {
            log.error("Unexpected error calling GPTunnel: {}", e.getMessage(), e);
            throw new RuntimeException("Unexpected error calling GPTunnel: " + e.getMessage(), e);
        }
    }
}
