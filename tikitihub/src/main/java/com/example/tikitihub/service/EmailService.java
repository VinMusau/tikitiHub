package com.example.tikitihub.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import com.example.tikitihub.model.Booking;
import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketTier;
import com.example.tikitihub.model.User;
import org.springframework.core.io.ByteArrayResource;

import jakarta.mail.internet.MimeMessage;
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;
    private final QrCodeService qrCodeService;

    public EmailService(JavaMailSender mailSender, QrCodeService qrCodeService) {
        this.mailSender = mailSender;
        this.qrCodeService = qrCodeService;
    }
    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendVerificationEmail(String targetEmail, String token, String fullName) {
        String activationUrl = frontendUrl + "/verify-email?token=" + token; 
        
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
            log.error("Critical Email execution pipeline failure: {}", e.getMessage(), e);
        }
    }

    public void sendTicketConfirmation(Booking booking, Ticket ticket, TicketTier tier, User buyer) {
        String to = buyer.getEmail();
        if (to == null || to.isBlank()) {
            log.warn("Skipping ticket email — buyer {} has no email", buyer.getId());
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("🎟️ Your ticket for " + ticket.getEventName());

            // Generate QR and attach inline
            byte[] qrPng;
            try {
                qrPng = qrCodeService.generatePng(booking.getQrRedemptionToken(), 400);
                helper.addInline("ticketQr", new ByteArrayResource(qrPng), "image/png");
            } catch (Exception e) {
                log.warn("QR generation failed for booking {} — sending email without QR", booking.getId(), e);
                qrPng = null;
            }

            String eventDate = ticket.getEventDate() != null
                    ? ticket.getEventDate().format(java.time.format.DateTimeFormatter.ofPattern("EEEE, MMMM d, yyyy 'at' h:mm a"))
                    : "TBC";

            String walletUrl = frontendUrl + "/my-tickets";

            String html = """
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #09090b;">
              <h2 style="margin: 0 0 8px;">Your ticket is confirmed</h2>
              <p style="color: #52525b; font-size: 14px; margin: 0 0 24px;">
                Thanks for your purchase, %s. Present the QR code below at the gate.
              </p>

              <div style="border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 4px; font-size: 18px;">%s</h3>
                <p style="color: #71717a; font-size: 13px; margin: 0 0 16px;">%s</p>

                <table style="width: 100%%; font-size: 13px; color: #52525b; border-collapse: collapse;">
                  <tr><td style="padding: 4px 0;">Date</td><td style="padding: 4px 0; color: #09090b; font-weight: 600;">%s</td></tr>
                  <tr><td style="padding: 4px 0;">Tier</td><td style="padding: 4px 0; color: #09090b; font-weight: 600;">%s</td></tr>
                  <tr><td style="padding: 4px 0;">Quantity</td><td style="padding: 4px 0; color: #09090b; font-weight: 600;">%d</td></tr>
                  <tr><td style="padding: 4px 0;">Booking ID</td><td style="padding: 4px 0; color: #09090b; font-family: monospace;">#%d</td></tr>
                </table>
              </div>

              <div style="text-align: center; background: #fafafa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                %s
                <p style="font-family: monospace; font-size: 11px; color: #71717a; word-break: break-all; margin: 16px 0 0;">
                  %s
                </p>
              </div>

              <p style="text-align: center; margin: 32px 0;">
                <a href="%s" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 12px; font-weight: 700; font-size: 14px;">
                  View in my wallet
                </a>
              </p>

              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 32px 0;" />
              <p style="color: #a1a1aa; font-size: 11px; line-height: 1.6;">
                Keep this email. You'll need the QR code or the token above to enter the venue.
                If you didn't make this purchase, contact support immediately.
              </p>
            </div>
            """.formatted(
                    escapeHtml(buyer.getFullName() != null ? buyer.getFullName() : "there"),
                    escapeHtml(ticket.getEventName()),
                    escapeHtml(ticket.getVenue() != null ? ticket.getVenue() : ""),
                    escapeHtml(eventDate),
                    escapeHtml(tier != null ? tier.getName() : "General"),
                    booking.getQuantity(),
                    booking.getId(),
                    qrPng != null
                            ? "<img src='cid:ticketQr' alt='Ticket QR Code' width='220' height='220' style='display: block; margin: 0 auto;' />"
                            : "<p style='color: #71717a; font-size: 12px;'>QR code unavailable — present the token below at the gate.</p>",
                    escapeHtml(booking.getQrRedemptionToken()),
                    walletUrl
            );

            helper.setText(html, true);
            mailSender.send(message);

            log.info("Ticket email sent to {} for booking {}", to, booking.getId());
        } catch (Exception e) {
            log.error("Failed to send ticket email to {} for booking {}", to, booking.getId(), e);
            // Swallow — do not fail the booking transaction because of an email
        }
    }

    private String escapeHtml(String input) {
        if (input == null) {
            return "";
        }
        return input.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}