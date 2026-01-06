package tech.nicorp.pm.auth.service;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
public class NiidService {

    @Value("${niid.base-url:http://localhost:8000}")
    private String niidBaseUrl;

    @Value("${niid.client-id:project-monitor-backend}")
    private String clientId;

    @Value("${niid.client-secret:secret}")
    private String clientSecret;

    private final RestTemplate restTemplate;

    public NiidService() {
        this.restTemplate = new RestTemplate();
    }

    public NiidUserInfo exchangeCode(String code, String redirectUri) {
        // 1. Exchange Code for Token
        String tokenUrl = niidBaseUrl + "/oauth/token";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        
        // Construct JSON body manually or use a Map
        Map<String, String> bodyMap = Map.of(
            "grant_type", "authorization_code",
            "code", code,
            "redirect_uri", redirectUri,
            "client_id", clientId,
            "client_secret", clientSecret
        );

        HttpEntity<Map<String, String>> request = new HttpEntity<>(bodyMap, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(tokenUrl, request, Map.class);
            
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new RuntimeException("Failed to exchange code for token");
            }

            String accessToken = (String) response.getBody().get("access_token");

            // 2. Get User Info
            return getUserInfo(accessToken);

        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            String resp = e.getResponseBodyAsString();
            System.err.println("NIID Error: " + resp); // Quick log for docker logs
            throw new RuntimeException("NIID Auth Failed: " + resp, e);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("NIID Auth Failed: " + e.getMessage(), e);
        }
    }

    public NiidUserInfo getUserInfo(String accessToken) {
        String userInfoUrl = niidBaseUrl + "/oauth/userinfo";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);

        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<NiidUserInfo> response = restTemplate.exchange(
                userInfoUrl,
                HttpMethod.GET,
                request,
                NiidUserInfo.class
        );

        if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
            throw new RuntimeException("Failed to fetch user info");
        }

        return response.getBody();
    }

    public static class NiidUserInfo {
        @JsonProperty("id")
        public String id;
        
        @JsonProperty("email")
        public String email;
        
        @JsonProperty("name")
        public String name;
        
        @JsonProperty("picture")
        public String picture;
    }
}
