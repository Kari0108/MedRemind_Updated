package com.medremind.model;

import javax.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalTime;

@Entity
@Table(name = "medicines")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Medicine {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    private String dosage;
    
    @Column(nullable = false)
    private LocalTime time;
    
    private String description;
    
    public Medicine(String name, String dosage, LocalTime time, String description) {
        this.name = name;
        this.dosage = dosage;
        this.time = time;
        this.description = description;
    }
}
