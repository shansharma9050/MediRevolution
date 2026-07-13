package com.example.medi.saas.repository;

import com.example.medi.saas.entity.SaasDiagnosticTest;
import com.example.medi.saas.enums.SaasDiagnosticType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SaasDiagnosticTestRepository extends JpaRepository<SaasDiagnosticTest, Long> {

    List<SaasDiagnosticTest> findByTenantIdAndDiagnosticTypeAndActiveTrueOrderByTestNameAsc(
            Long tenantId,
            SaasDiagnosticType diagnosticType
    );

    Optional<SaasDiagnosticTest> findByIdAndTenantIdAndActiveTrue(Long id, Long tenantId);
}
