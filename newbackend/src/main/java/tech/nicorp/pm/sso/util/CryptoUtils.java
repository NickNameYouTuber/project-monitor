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
    
    private static final String DEFAULT_KEY = "12345678901234567890123456789012";
    
    private static String getEncryptionKey() {
        String envKey = System.getenv("SSO_ENCRYPTION_KEY");
        if (envKey != null && !envKey.isEmpty()) {
            return envKey;
        }
        return Base64.getEncoder().encodeToString(DEFAULT_KEY.getBytes(StandardCharsets.UTF_8));
    }
    
    public static String encrypt(String plainText) throws Exception {
        String keyString = getEncryptionKey();
        
        byte[] keyBytes = Base64.getDecoder().decode(keyString);
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
        // Проверка: если строка не похожа на base64 (содержит недопустимые символы),
        // считаем её plain text (для обратной совместимости)
        if (encryptedText.contains("-") || encryptedText.contains("_") || 
            (!encryptedText.matches("^[A-Za-z0-9+/]*={0,2}$"))) {
            System.out.println("[CryptoUtils] Value is not encrypted, returning as plain text");
            return encryptedText;
        }
        
        try {
            String keyString = getEncryptionKey();
            
            byte[] keyBytes = Base64.getDecoder().decode(keyString);
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
        } catch (Exception e) {
            System.err.println("[CryptoUtils] Decryption failed, returning as plain text: " + e.getMessage());
            return encryptedText;
        }
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

