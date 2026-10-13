package com.medremind.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AIRequest {
    private String name;
    private String dosage;
    private String description;
    private String symptoms;
    private String medicine;
}
