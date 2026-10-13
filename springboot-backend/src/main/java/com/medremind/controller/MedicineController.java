package com.medremind.controller;

import com.medremind.dto.AIRequest;
import com.medremind.dto.AIResponse;
import com.medremind.model.Medicine;
import com.medremind.service.AIService;
import com.medremind.service.MedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class MedicineController {
    
    private final MedicineService medicineService;
    private final AIService aiService;
    
    // GET all medicines
    @GetMapping("/medicines")
    public ResponseEntity<List<Medicine>> getAllMedicines() {
        List<Medicine> medicines = medicineService.getAllMedicines();
        return ResponseEntity.ok(medicines);
    }
    
    // POST add medicine
    @PostMapping("/medicines")
    public ResponseEntity<Medicine> addMedicine(@RequestBody Medicine medicine) {
        if (medicine.getName() == null || medicine.getTime() == null) {
            return ResponseEntity.badRequest().build();
        }
        Medicine savedMedicine = medicineService.addMedicine(medicine);
        return ResponseEntity.status(HttpStatus.CREATED).body(savedMedicine);
    }
    
    // PUT update medicine
    @PutMapping("/medicines/{id}")
    public ResponseEntity<Medicine> updateMedicine(@PathVariable Long id, @RequestBody Medicine medicine) {
        if (medicine.getName() == null || medicine.getTime() == null) {
            return ResponseEntity.badRequest().build();
        }
        Medicine updatedMedicine = medicineService.updateMedicine(id, medicine);
        if (updatedMedicine != null) {
            return ResponseEntity.ok(updatedMedicine);
        }
        return ResponseEntity.notFound().build();
    }
    
    // DELETE medicine
    @DeleteMapping("/medicines/{id}")
    public ResponseEntity<Void> deleteMedicine(@PathVariable Long id) {
        boolean deleted = medicineService.deleteMedicine(id);
        if (deleted) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
    
    // POST explain medicine (AI)
    @PostMapping("/explain")
    public ResponseEntity<AIResponse> explainMedicine(@RequestBody AIRequest request) {
        AIResponse response = aiService.explainMedicine(request);
        if (response.getError() != null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
        return ResponseEntity.ok(response);
    }
    
    // GET alternatives (AI)
    @GetMapping("/alternatives/{name}")
    public ResponseEntity<AIResponse> getAlternatives(@PathVariable String name) {
        AIResponse response = aiService.getAlternatives(name);
        if (response.getError() != null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
        return ResponseEntity.ok(response);
    }
    
    // POST symptom to medicine (AI)
    @PostMapping("/symptom-to-medicine")
    public ResponseEntity<AIResponse> getSymptomSuggestions(@RequestBody AIRequest request) {
        if (request.getSymptoms() == null || request.getSymptoms().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        AIResponse response = aiService.getSymptomSuggestions(request.getSymptoms());
        if (response.getError() != null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
        return ResponseEntity.ok(response);
    }
    
    // POST price comparison (AI)
    @PostMapping("/price-comparison")
    public ResponseEntity<AIResponse> getPriceComparison(@RequestBody AIRequest request) {
        if (request.getMedicine() == null || request.getMedicine().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        AIResponse response = aiService.getPriceComparison(request.getMedicine());
        if (response.getError() != null) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
        return ResponseEntity.ok(response);
    }
}
