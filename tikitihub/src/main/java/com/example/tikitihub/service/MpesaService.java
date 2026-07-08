package com.example.tikitihub.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class MpesaService {
    private final String consumerKey = "BYF6GKI1wOOTFd5oH2iEQGj9BL69GH88pBYYLZGupbzsHLLl";
    private final String consumerSecret = "EENRdszEZQlPSqOxQ0aMjQb2t15lmDnAMrimGIJaJkwbGG1Tt2HXM9SZut2RLdf1";
    private final String shortCode = "174379";
    private final String passKey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
    private final String callbackUrl = "https://latrisha-maladapted-asia.ngrok-free.dev/api/payments/mpesa-callback";

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // Generate dynamic Auth token from safaricom
    public String getAccessToken() {
        String url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
        String auth = consumerKey + ":" + consumerSecret;
        String encodedAuth = Base64.getEncoder().encodeToString(auth.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Basic " + encodedAuth);
        HttpEntity<String> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.GET, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());
            return root.path("access_token").asText();
        } catch (Exception e) {
            throw new RuntimeException("Failed to fetch Daraja Access Token", e);
        }
    }

    // Trigger stk push pop up
    public Map<String, String> initiateStkPush(String phone, String amount, String accountReference) {
        String token = getAccessToken();
        String url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";

        // Generate Password format: Base64(Shortcode + Passkey + Timestamp)
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String toHash = shortCode + passKey + timestamp;
        String password = Base64.getEncoder().encodeToString(toHash.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);

        Map<String, Object> body = new HashMap<>();
        body.put("BusinessShortCode", shortCode);
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("TransactionType", "CustomerPayBillOnline");
        body.put("Amount", amount);
        body.put("PartyA", phone); // The user's phone (e.g. 254712345678)
        body.put("PartyB", shortCode);
        body.put("PhoneNumber", phone);
        body.put("CallBackURL", callbackUrl);
        body.put("AccountReference", accountReference);
        body.put("TransactionDesc", "TikitiHub Purchase");

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            JsonNode root = objectMapper.readTree(response.getBody());

            return Map.of(
                "CheckoutRequestID", root.path("CheckoutRequestID").asText(),
                "ResponseCode", root.path("ResponseCode").asText(),
                "CustomerMessage", root.path("CustomerMessage").asText()
            );
        } catch (Exception e) {
            throw new RuntimeException("STK Push initialization execution failed", e);
        }
    }
}