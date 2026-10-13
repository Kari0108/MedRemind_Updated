package com.medremind.service;

import com.medremind.model.Medicine;
import com.medremind.repository.MedicineRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class MedicineService {
    
    private final MedicineRepository medicineRepository;
    
    public List<Medicine> getAllMedicines() {
        return medicineRepository.findAll();
    }
    
    public Optional<Medicine> getMedicineById(Long id) {
        return medicineRepository.findById(id);
    }
    
    public Medicine addMedicine(Medicine medicine) {
        return medicineRepository.save(medicine);
    }
    
    public Medicine updateMedicine(Long id, Medicine medicine) {
        Optional<Medicine> existingMedicine = medicineRepository.findById(id);
        if (existingMedicine.isPresent()) {
            Medicine med = existingMedicine.get();
            med.setName(medicine.getName());
            med.setDosage(medicine.getDosage());
            med.setTime(medicine.getTime());
            med.setDescription(medicine.getDescription());
            return medicineRepository.save(med);
        }
        return null;
    }
    
    public boolean deleteMedicine(Long id) {
        if (medicineRepository.existsById(id)) {
            medicineRepository.deleteById(id);
            return true;
        }
        return false;
    }
}
