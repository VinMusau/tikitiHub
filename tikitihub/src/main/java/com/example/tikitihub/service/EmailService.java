package com.example.tikitihub.service;

import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import jakarta.mail.internet.MimeMessage;
@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String targetEmail, String token, String fullName) {
        String activationUrl = "/verify-email?token=" + token; 
        
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setTo(targetEmail);
            helper.setSubject("🎟️ Verify Your TikitiHub Account");
            
            String htmlContent = String.format(
                "<h3>Welcome to TikitiHub, %s!</h3>" +
                "<p>Please click the button below to confirm your email and activate your pass-buying portal:</p>" +
                "<a href='%s' style='background:#4f46e5;color:white;padding:10px 20px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;'>Activate Account</a>" +
                "<p style='color:#71717a;font-size:11px;margin-top:20px;'>If the button doesn't work, copy-paste this link: %s</p>",
                fullName, activationUrl, activationUrl
            );
            
            helper.setText(htmlContent, true);
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Critical Email execution pipeline failure: " + e.getMessage());
        }
    }
}