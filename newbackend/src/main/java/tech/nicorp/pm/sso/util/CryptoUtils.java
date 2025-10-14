package tech.nicorp.pm.sso.util;

import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

public class CryptoUtils {
    
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    
    private static final String ENCRYPTION_KEY = System.getenv("SSO_ENCRYPTION_KEY");
    
    public static String encrypt(String plainText) throws Exception {
        if (ENCRYPTION_KEY == null || ENCRYPTION_KEY.isEmpty()) {
            throw new IllegalStateException("SSO_ENCRYPTION_KEY environment variable not set");
        }
        
        byte[] keyBytes = Base64.getDecoder().decode(ENCRYPTION_KEY);
        SecretKey key = new SecretKeySpec(keyBytes, "AES");
        
        byte[] iv = new byte[GCM_IV_LENGTH];
        SecureRandom random = new SecureRandom();
        random.nextBytes(iv);
        
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.ENCRYPT_MODE, key, parameterSpec);
        
        byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));
        
        ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
        byteBuffer.put(iv);
        byteBuffer.put(cipherText);
        
        return Base64.getEncoder().encodeToString(byteBuffer.array());
    }
    
    public static String decrypt(String encryptedText) throws Exception {
        if (ENCRYPTION_KEY == null || ENCRYPTION_KEY.isEmpty()) {
            throw new IllegalStateException("SSO_ENCRYPTION_KEY environment variable not set");
        }
        
        byte[] keyBytes = Base64.getDecoder().decode(ENCRYPTION_KEY);
        SecretKey key = new SecretKeySpec(keyBytes, "AES");
        
        byte[] decodedBytes = Base64.getDecoder().decode(encryptedText);
        ByteBuffer byteBuffer = ByteBuffer.wrap(decodedBytes);
        
        byte[] iv = new byte[GCM_IV_LENGTH];
        byteBuffer.get(iv);
        
        byte[] cipherText = new byte[byteBuffer.remaining()];
        byteBuffer.get(cipherText);
        
        Cipher cipher = Cipher.getInstance(ALGORITHM);
        GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
        cipher.init(Cipher.DECRYPT_MODE, key, parameterSpec);
        
        byte[] plainText = cipher.doFinal(cipherText);
        return new String(plainText, StandardCharsets.UTF_8);
    }
    
    public static String generateEncryptionKey() throws Exception {
        KeyGenerator keyGenerator = KeyGenerator.getInstance("AES");
        keyGenerator.init(256, new SecureRandom());
        SecretKey key = keyGenerator.generateKey();
        return Base64.getEncoder().encodeToString(key.getEncoded());
    }
    
    public static String generateState() {
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
    
    public static String generateCodeVerifier() {
        byte[] randomBytes = new byte[32];
        new SecureRandom().nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}

