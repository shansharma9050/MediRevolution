package com.example.medi.saas.service;

import com.example.medi.saas.dto.SaasTenantSettingRequest;
import com.example.medi.saas.dto.SaasTenantSettingResponse;
import com.example.medi.saas.entity.SaasTenantSetting;
import com.example.medi.saas.entity.Tenant;
import com.example.medi.saas.repository.SaasTenantSettingRepository;
import com.example.medi.saas.repository.TenantRepository;
import com.example.medi.saas.security.CurrentUserUtil;
import org.springframework.stereotype.Service;

@Service
public class SaasTenantSettingService {

    private final SaasTenantSettingRepository settingRepository;
    private final TenantRepository tenantRepository;
    private final TenantAccessService tenantAccessService;

    public SaasTenantSettingService(
            SaasTenantSettingRepository settingRepository,
            TenantRepository tenantRepository,
            TenantAccessService tenantAccessService
    ) {
        this.settingRepository = settingRepository;
        this.tenantRepository = tenantRepository;
        this.tenantAccessService = tenantAccessService;
    }

    public SaasTenantSettingResponse getSettings(Long tenantId) {

        tenantAccessService.validateTenantAccess(tenantId);

        SaasTenantSetting setting = settingRepository
                .findByTenantIdAndActiveTrue(tenantId)
                .orElseGet(() -> createDefaultSetting(tenantId));

        return toResponse(setting);
    }

    public SaasTenantSettingResponse saveSettings(SaasTenantSettingRequest request) {

        if (request.getTenantId() == null) {
            throw new RuntimeException("tenantId is required");
        }

        tenantAccessService.validateOwnerOrAdmin(request.getTenantId());

        SaasTenantSetting setting = settingRepository
                .findByTenantId(request.getTenantId())
                .orElseGet(() -> createDefaultSetting(request.getTenantId()));

        setting.setBusinessName(request.getBusinessName());
        setting.setBusinessType(request.getBusinessType());
        setting.setLogoUrl(request.getLogoUrl());
        setting.setAddress(request.getAddress());
        setting.setCity(request.getCity());
        setting.setState(request.getState());
        setting.setPincode(request.getPincode());
        setting.setCountry(request.getCountry());
        setting.setContactEmail(request.getContactEmail());
        setting.setContactMobile(request.getContactMobile());
        setting.setWebsite(request.getWebsite());
        setting.setGstNumber(request.getGstNumber());
        setting.setRegistrationNumber(request.getRegistrationNumber());
        setting.setThemeColor(
                request.getThemeColor() == null || request.getThemeColor().isBlank()
                        ? "#05285f"
                        : request.getThemeColor()
        );
        setting.setInvoiceHeader(request.getInvoiceHeader());
        setting.setInvoiceFooter(request.getInvoiceFooter());
        setting.setPrescriptionHeader(request.getPrescriptionHeader());
        setting.setPrescriptionFooter(request.getPrescriptionFooter());
        setting.setReportHeader(request.getReportHeader());
        setting.setReportFooter(request.getReportFooter());
        setting.setWorkingDays(request.getWorkingDays());
        setting.setOpeningTime(request.getOpeningTime());
        setting.setClosingTime(request.getClosingTime());
        setting.setActive(true);
        setting.setUpdatedByAuthUserId(CurrentUserUtil.getUserId());
        setting.touch();

        SaasTenantSetting saved = settingRepository.save(setting);

        /*
         * Optional sync with tenant basic info.
         */
        tenantRepository.findById(request.getTenantId()).ifPresent(tenant -> {
            if (request.getBusinessName() != null && !request.getBusinessName().isBlank()) {
                tenant.setTenantName(request.getBusinessName());
            }

            tenant.setLogoUrl(request.getLogoUrl());
            tenant.setAddress(request.getAddress());
            tenant.setCity(request.getCity());
            tenant.setState(request.getState());
            tenant.setPincode(request.getPincode());
            tenant.setContactEmail(request.getContactEmail());
            tenant.setContactMobile(request.getContactMobile());
            tenant.touch();

            tenantRepository.save(tenant);
        });

        return toResponse(saved);
    }

    public SaasTenantSetting getSettingEntityOrDefault(Long tenantId) {
        return settingRepository
                .findByTenantIdAndActiveTrue(tenantId)
                .orElseGet(() -> createDefaultSetting(tenantId));
    }

    private SaasTenantSetting createDefaultSetting(Long tenantId) {

        Tenant tenant = tenantRepository
                .findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        SaasTenantSetting setting = new SaasTenantSetting();
        setting.setTenantId(tenantId);
        setting.setBusinessName(tenant.getTenantName());
        setting.setBusinessType(tenant.getTenantType().name());
        setting.setLogoUrl(tenant.getLogoUrl());
        setting.setAddress(tenant.getAddress());
        setting.setCity(tenant.getCity());
        setting.setState(tenant.getState());
        setting.setPincode(tenant.getPincode());
        setting.setContactEmail(tenant.getContactEmail());
        setting.setContactMobile(tenant.getContactMobile());
        setting.setCountry("India");
        setting.setThemeColor("#05285f");
        setting.setInvoiceHeader("Invoice");
        setting.setInvoiceFooter("Thank you for choosing us.");
        setting.setPrescriptionHeader("Prescription");
        setting.setPrescriptionFooter("This prescription is generated by MediRevolution SaaS.");
        setting.setReportHeader("Diagnostic Report");
        setting.setReportFooter("This report is generated by MediRevolution SaaS.");
        setting.setWorkingDays("MONDAY-SATURDAY");
        setting.setOpeningTime("09:00 AM");
        setting.setClosingTime("06:00 PM");
        setting.setActive(true);

        return settingRepository.save(setting);
    }

    private SaasTenantSettingResponse toResponse(SaasTenantSetting setting) {
        return new SaasTenantSettingResponse(
                setting.getId(),
                setting.getTenantId(),
                setting.getBusinessName(),
                setting.getBusinessType(),
                setting.getLogoUrl(),
                setting.getAddress(),
                setting.getCity(),
                setting.getState(),
                setting.getPincode(),
                setting.getCountry(),
                setting.getContactEmail(),
                setting.getContactMobile(),
                setting.getWebsite(),
                setting.getGstNumber(),
                setting.getRegistrationNumber(),
                setting.getThemeColor(),
                setting.getInvoiceHeader(),
                setting.getInvoiceFooter(),
                setting.getPrescriptionHeader(),
                setting.getPrescriptionFooter(),
                setting.getReportHeader(),
                setting.getReportFooter(),
                setting.getWorkingDays(),
                setting.getOpeningTime(),
                setting.getClosingTime(),
                setting.getActive()
        );
    }
}