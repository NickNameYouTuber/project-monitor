import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;
import java.util.HashMap;

public class NIGItIdentityProviderExample {
    
    private static final String API_BASE_URL = "https://your-nigit-instance.com/api";
    private static final String API_KEY = "ipk_your_api_key_here";
    private static final String API_SECRET = "ips_your_api_secret_here";
    
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    public NIGItIdentityProviderExample() {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }
    
    public Map<String, Object> authenticateUser(String email, String password) {
        try {
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("email", email);
            requestBody.put("password", password);
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(API_BASE_URL + "/identity-provider/authenticate"))
                    .header("X-API-Key", API_KEY)
                    .header("X-API-Secret", API_SECRET)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();
            
            HttpResponse<String> response = httpClient.send(
                    request, 
                    HttpResponse.BodyHandlers.ofString()
            );
            
            Map<String, Object> responseData = objectMapper.readValue(
                    response.body(), 
                    Map.class
            );
            
            if (Boolean.TRUE.equals(responseData.get("success"))) {
                System.out.println("Authentication successful");
                Map<String, Object> user = (Map<String, Object>) responseData.get("user");
                System.out.println("User info: " + user);
                return user;
            } else {
                System.err.println("Authentication failed: " + responseData.get("message"));
                return null;
            }
            
        } catch (Exception e) {
            System.err.println("Error during authentication: " + e.getMessage());
            return null;
        }
    }
    
    public Map<String, Object> handleWebhook(Map<String, Object> payload) {
        String event = (String) payload.get("event");
        
        if ("password_changed".equals(event)) {
            String email = (String) payload.get("email");
            String orgId = (String) payload.get("organization_id");
            Long timestamp = (Long) payload.get("timestamp");
            
            System.out.println("Password changed for user: " + email);
            System.out.println("Organization: " + orgId);
            System.out.println("Timestamp: " + timestamp);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            return response;
        } else {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Unknown event");
            return response;
        }
    }
    
    public static void main(String[] args) {
        NIGItIdentityProviderExample example = new NIGItIdentityProviderExample();
        Map<String, Object> user = example.authenticateUser("user@company.com", "password123");
        
        if (user != null) {
            System.out.println("Authenticated user ID: " + user.get("user_id"));
        }
    }
}

