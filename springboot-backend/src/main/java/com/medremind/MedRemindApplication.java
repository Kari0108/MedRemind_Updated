package com.medremind;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MedRemindApplication {
    
    public static void main(String[] args) {
        SpringApplication.run(MedRemindApplication.class, args);
        System.out.println("🚀 MedRemind Spring Boot Backend running on port 8080");
    }
}
