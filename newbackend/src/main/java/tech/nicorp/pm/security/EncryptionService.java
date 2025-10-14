package tech.nicorp.pm.security;

import org.springframework.security.crypto.encrypt.Encryptors;
import org.springframework.security.crypto.encrypt.TextEncryptor;
import org.springframework.security.crypto.keygen.KeyGenerators;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;
import java.util.UUID;

@Service
public class EncryptionService {
    
    private static final String ALGORITHM = "AES";
    private static final String MASTER_KEY = System.getenv().getOrDefault("ENCRYPTION_MASTER_KEY", "default-master-key-change-in-production");
    
    public String encryptPassword(String password, UUID organizationId) {
        try {
            String orgKey = deriveOrganizationKey(organizationId);
            SecretKey secretKey = generateKey(orgKey);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            byte[] encryptedBytes = cipher.doFinal(password.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(encryptedBytes);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt password", e);
        }
    }
    
    public String decryptPassword(String encryptedPassword, UUID organizationId) {
        try {
            String orgKey = deriveOrganizationKey(organizationId);
            SecretKey secretKey = generateKey(orgKey);
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, secretKey);
            byte[] decryptedBytes = cipher.doFinal(Base64.getDecoder().decode(encryptedPassword));
            return new String(decryptedBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt password", e);
        }
    }
    
    public String generateApiKey() {
        return "ipk_" + UUID.randomUUID().toString().replace("-", "");
    }
    
    public String generateApiSecret() {
        return "ips_" + UUID.randomUUID().toString() + UUID.randomUUID().toString().replace("-", "");
    }
    
    private String deriveOrganizationKey(UUID organizationId) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            String combined = MASTER_KEY + organizationId.toString();
            byte[] hash = digest.digest(combined.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash).substring(0, 32);
        } catch (Exception e) {
            throw new RuntimeException("Failed to derive organization key", e);
        }
    }
    
    private SecretKey generateKey(String key) throws Exception {
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        byte[] keyBytes = digest.digest(key.getBytes(StandardCharsets.UTF_8));
        byte[] truncatedKey = new byte[16];
        System.arraycopy(keyBytes, 0, truncatedKey, 0, 16);
        return new SecretKeySpec(truncatedKey, ALGORITHM);
    }
}

