package com.example.tikitihub.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.example.tikitihub.config.MpesaProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class MpesaService {

    private final MpesaProperties props;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MpesaService(MpesaProperties props, RestTemplate restTemplate) {
        this.props = props;
        this.restTemplate = restTemplate;
    }

    // Generate dynamic Auth token from safaricom
    public String getAccessToken() {
        String url = props.getBaseUrl() + "/oauth/v1/generate?grant_type=client_credentials";
        String auth = props.getConsumerKey() + ":" + props.getConsumerSecret();
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
        String url = props.getBaseUrl() + "/mpesa/stkpush/v1/processrequest";

        // Generate Password format: Base64(Shortcode + Passkey + Timestamp)
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        String toHash = props.getShortCode() + props.getPassKey() + timestamp;
        String password = Base64.getEncoder().encodeToString(toHash.getBytes(StandardCharsets.UTF_8));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization", "Bearer " + token);

        Map<String, Object> body = new HashMap<>();
        body.put("BusinessShortCode", props.getShortCode());
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("TransactionType", "CustomerPayBillOnline");
        body.put("Amount", amount);
        body.put("PartyA", phone);
        body.put("PartyB", props.getShortCode());
        body.put("PhoneNumber", phone);
        body.put("CallBackURL", props.getCallbackUrl());
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