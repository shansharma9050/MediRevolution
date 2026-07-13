package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasIpdDailyNote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SaasIpdDailyNoteRepository extends JpaRepository<SaasIpdDailyNote, Long> {

    List<SaasIpdDailyNote> findByTenantIdAndAdmissionIdOrderByNoteDateTimeDesc(
            Long tenantId,
            Long admissionId
    );
}