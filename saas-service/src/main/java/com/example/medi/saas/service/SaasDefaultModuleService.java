package com.example.medi.saas.service;

import java.util.EnumSet;
import java.util.Set;

import org.springframework.stereotype.Service;

import com.example.medi.saas.enums.TenantModule;
import com.example.medi.saas.enums.TenantType;

@Service
public class SaasDefaultModuleService {

    public Set<TenantModule> getDefaultModules(TenantType tenantType) {

        if (tenantType == null) {
            return EnumSet.of(
                    TenantModule.DASHBOARD,
                    TenantModule.NOTIFICATIONS,
                    TenantModule.SETTINGS,
                    TenantModule.PERMISSIONS
            );
        }

        return switch (tenantType) {

            case DOCTOR_CLINIC -> getDoctorClinicModules();

            case HOSPITAL -> getHospitalModules();

            case WHOLESALER -> getWholesalerModules();

            case RETAILER -> getRetailerModules();
        };
    }

    /*
     * Existing Doctor Clinic behavior preserve kiya gaya hai.
     */
    private Set<TenantModule> getDoctorClinicModules() {

        return EnumSet.of(
                TenantModule.DASHBOARD,
                TenantModule.PATIENTS,
                TenantModule.APPOINTMENTS,
                TenantModule.PRESCRIPTIONS,
                TenantModule.BILLING,
                TenantModule.REPORTS,
                TenantModule.NOTIFICATIONS,
                TenantModule.SETTINGS,
                TenantModule.PERMISSIONS
        );
    }

    /*
     * Existing Hospital behavior preserve:
     * Pehle Hospital ke liye TenantModule.values() ke sabhi modules
     * enabled hote the.
     */
    private Set<TenantModule> getHospitalModules() {

        return EnumSet.allOf(TenantModule.class);
    }

    private Set<TenantModule> getWholesalerModules() {

        return EnumSet.of(
                TenantModule.DASHBOARD,
                TenantModule.MEDICINE_MASTER,
                TenantModule.SUPPLIERS,
                TenantModule.CUSTOMERS,
                TenantModule.PURCHASES,
                TenantModule.INVENTORY,
                TenantModule.SALES,
                TenantModule.SALES_ORDERS,
                TenantModule.PURCHASE_RETURNS,
                TenantModule.SALES_RETURNS,
                TenantModule.BILLING,
                TenantModule.PAYMENTS,
                TenantModule.EXPIRY_MANAGEMENT,
                TenantModule.REPORTS,
                TenantModule.NOTIFICATIONS,
                TenantModule.STAFF,
                TenantModule.SETTINGS,
                TenantModule.PERMISSIONS
        );
    }

    private Set<TenantModule> getRetailerModules() {

        return EnumSet.of(
                TenantModule.DASHBOARD,
                TenantModule.MEDICINE_MASTER,
                TenantModule.SUPPLIERS,
                TenantModule.CUSTOMERS,
                TenantModule.PURCHASES,
                TenantModule.INVENTORY,
                TenantModule.SALES,
                TenantModule.PURCHASE_RETURNS,
                TenantModule.SALES_RETURNS,
                TenantModule.BILLING,
                TenantModule.PAYMENTS,
                TenantModule.EXPIRY_MANAGEMENT,
                TenantModule.REPORTS,
                TenantModule.NOTIFICATIONS,
                TenantModule.STAFF,
                TenantModule.SETTINGS,
                TenantModule.PERMISSIONS
        );
    }
}