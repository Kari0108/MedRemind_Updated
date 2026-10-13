package com.medremind.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIResponse {
    private String explanation;
    private String alternatives;
    private String suggestions;
    private String comparison;
    private String error;
}
