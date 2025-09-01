package tech.nicorp.pm.utils;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class PasswordHashGenerator {
    public static void main(String[] args) {
        if (args.length != 1) {
            System.out.println("Usage: java PasswordHashGenerator <password>");
            System.exit(1);
        }
        
        String password = args[0];
        BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
        String hash = encoder.encode(password);
        
        System.out.println("Password: " + password);
        System.out.println("BCrypt Hash: " + hash);
        System.out.println("SQL INSERT:");
        System.out.println("UPDATE users SET password_hash = '" + hash + "' WHERE username = 'test';");
    }
}
