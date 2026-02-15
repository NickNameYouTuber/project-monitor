package tech.nicorp.pm.auth.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Service
public class NiidService {

    @Value("${niid.base-url:http://localhost:8000}")
    private String niidBaseUrl;

    @Value("${niid.client-id:project-monitor-backend}")
    private String clientId;

    @Value("${niid.client-secret:secret}")
    private String clientSecret;

    private final ObjectMapper objectMapper;

    public NiidService() {
        this.objectMapper = new ObjectMapper();
    }

    public NiidUserInfo exchangeCode(String code, String redirectUri) {
        try {
            // 1. Exchange Code for Token
            String tokenUrl = niidBaseUrl + "/oauth/token";
            
            Map<String, String> bodyMap = new HashMap<>();
            bodyMap.put("grant_type", "authorization_code");
            bodyMap.put("code", code);
            bodyMap.put("redirect_uri", redirectUri);
            bodyMap.put("client_id", clientId);
            bodyMap.put("client_secret", clientSecret);
            
            String jsonBody = objectMapper.writeValueAsString(bodyMap);
            byte[] jsonBytes = jsonBody.getBytes(StandardCharsets.UTF_8);
            
            System.out.println("=== NIID Token Request (HttpURLConnection) ===");
            System.out.println("URL: " + tokenUrl);
            System.out.println("Body: " + jsonBody);
            
            URL url = new URL(tokenUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("Content-Length", String.valueOf(jsonBytes.length));
            conn.setDoOutput(true);
            
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBytes);
                os.flush();
            }
            
            int responseCode = conn.getResponseCode();
            System.out.println("Response Code: " + responseCode);
            
            if (responseCode >= 200 && responseCode < 300) {
                @SuppressWarnings("unchecked")
                Map<String, Object> responseMap = objectMapper.readValue(conn.getInputStream(), Map.class);
                String accessToken = (String) responseMap.get("access_token");
                
                System.out.println("✅ Got access token");
                System.out.println("===========================================");
                
                // 2. Get User Info
                return getUserInfo(accessToken);
            } else {
                String errorBody = new String(conn.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                System.err.println("NIID Error: " + errorBody);
                throw new RuntimeException("NIID Auth Failed: " + errorBody);
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("NIID Auth Failed: " + e.getMessage(), e);
        }
    }

    public NiidUserInfo getUserInfo(String accessToken) {
        try {
            String userInfoUrl = niidBaseUrl + "/oauth/userinfo";
            
            URL url = new URL(userInfoUrl);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Authorization", "Bearer " + accessToken);
            
            int responseCode = conn.getResponseCode();
            
            if (responseCode >= 200 && responseCode < 300) {
                return objectMapper.readValue(conn.getInputStream(), NiidUserInfo.class);
            } else {
                String errorBody = new String(conn.getErrorStream().readAllBytes(), StandardCharsets.UTF_8);
                throw new RuntimeException("Failed to fetch user info: " + errorBody);
            }
            
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to fetch user info: " + e.getMessage(), e);
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
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
