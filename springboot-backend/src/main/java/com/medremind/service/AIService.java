package com.medremind.service;

import com.medremind.dto.AIRequest;
import com.medremind.dto.AIResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;

@Service
public class AIService {
    
    @Value("${openrouter.api.key}")
    private String openRouterApiKey;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public AIResponse explainMedicine(AIRequest request) {
        try {
            String prompt = String.format(
                "Explain the medicine \"%s\" with dosage \"%s\" in plain, simple English. Keep it under 3 sentences. Focus on what it is primarily used for. Description: %s",
                request.getName(), request.getDosage(), request.getDescription()
            );
            
            String response = callOpenRouter(prompt);
            
            if (response != null) {
                AIResponse aiResponse = new AIResponse();
                aiResponse.setExplanation(response);
                return aiResponse;
            }
            
            return errorResponse("Failed to get explanation from AI");
        } catch (Exception e) {
            return errorResponse("Error: " + e.getMessage());
        }
    }
    
    public AIResponse getAlternatives(String name) {
        try {
            String prompt = String.format(
                "Suggest 3-5 alternative medicines available in India that are similar to \"%s\". IMPORTANT: Only suggest actual pharmaceutical medicines (not herbal or Ayurvedic products). Include both generic names and popular brand names available in Indian pharmacies. Format as a clean numbered list with each item on its own line. Focus on cost-effective pharmaceutical alternatives that have the same active ingredients or similar therapeutic class.",
                name
            );
            
            String response = callOpenRouter(prompt);
            
            if (response != null) {
                AIResponse aiResponse = new AIResponse();
                aiResponse.setAlternatives(response);
                return aiResponse;
            }
            
            return errorResponse("Failed to get alternatives from AI");
        } catch (Exception e) {
            return errorResponse("Error: " + e.getMessage());
        }
    }
    
    public AIResponse getSymptomSuggestions(String symptoms) {
        try {
            String prompt = String.format(
                "Based on these symptoms: \"%s\", suggest 3-5 appropriate over-the-counter medicines available in India. Include both generic names and popular brand names. For each suggestion, provide the medicine name, what it treats, and recommended dosage. IMPORTANT: Add a disclaimer that this is not medical advice and they should consult a doctor. Format as a clean numbered list. Focus on common, safe over-the-counter medicines.",
                symptoms
            );
            
            String response = callOpenRouter(prompt);
            
            if (response != null) {
                AIResponse aiResponse = new AIResponse();
                aiResponse.setSuggestions(response);
                return aiResponse;
            }
            
            return errorResponse("Failed to get suggestions from AI");
        } catch (Exception e) {
            return errorResponse("Error: " + e.getMessage());
        }
    }
    
    public AIResponse getPriceComparison(String medicine) {
        try {
            String prompt = String.format(
                "For the medicine \"%s\", provide practical information about purchasing it in India. Include: 1) Typical price range in INR for common dosages (be realistic), 2) Popular Indian online pharmacies where this medicine is commonly available (1mg, PharmEasy, Netmeds, Amazon Pharmacy, Tata 1mg), 3) General tips for finding better prices (compare across platforms, look for discounts, consider generic versions). IMPORTANT: These are estimates - always verify actual prices on the pharmacy websites. Be helpful and practical. Format as a clean list with clear sections.",
                medicine
            );
            
            String response = callOpenRouter(prompt);
            
            if (response != null) {
                AIResponse aiResponse = new AIResponse();
                aiResponse.setComparison(response);
                return aiResponse;
            }
            
            return errorResponse("Failed to get price comparison from AI");
        } catch (Exception e) {
            return errorResponse("Error: " + e.getMessage());
        }
    }
    
    private String callOpenRouter(String prompt) throws Exception {
        String requestBody = String.format(
            "{\"model\": \"openrouter/free\", \"messages\": [{\"role\": \"system\", \"content\": \"You are a helpful medical assistant.\"}, {\"role\": \"user\", \"content\": \"%s\"}]}",
            prompt.replace("\"", "\\\"")
        );
        
        URL url = new URL("https://openrouter.ai/api/v1/chat/completions");
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Authorization", "Bearer " + openRouterApiKey);
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("HTTP-Referer", "http://localhost:8080");
        connection.setRequestProperty("X-Title", "MedRemind");
        connection.setDoOutput(true);
        
        try (DataOutputStream wr = new DataOutputStream(connection.getOutputStream())) {
            wr.writeBytes(requestBody);
            wr.flush();
        }
        
        int responseCode = connection.getResponseCode();
        if (responseCode == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(connection.getInputStream()));
            StringBuilder response = new StringBuilder();
            String inputLine;
            while ((inputLine = in.readLine()) != null) {
                response.append(inputLine);
            }
            in.close();
            
            JsonNode jsonNode = objectMapper.readTree(response.toString());
            JsonNode choices = jsonNode.path("choices");
            if (choices.isArray() && choices.size() > 0) {
                JsonNode message = choices.get(0).path("message");
                return message.path("content").asText();
            }
        }
        
        connection.disconnect();
        return null;
    }
    
    private AIResponse errorResponse(String error) {
        AIResponse response = new AIResponse();
        response.setError(error);
        return response;
    }
}
