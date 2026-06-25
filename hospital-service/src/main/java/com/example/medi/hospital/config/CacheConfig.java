package com.example.medi.hospital.config;

import java.util.concurrent.TimeUnit;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {

        CaffeineCacheManager manager =
                new CaffeineCacheManager(

                        "hospitalDoctors",
                        "myHospitalDoctors",

                        "doctorAvailability",
                        "hospitalSlots",

                        "hospitalPatients",
                        "hospitalStaff",
                        "hospitalInventory",
                        "hospitalBills",

                        "hospitalAppointments",
                        "patientHospitalAppointments",

                        "hospitalDashboard",
                        "publicHospitalDoctors"
                );

        manager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(5000)
                        .expireAfterWrite(10, TimeUnit.MINUTES)
        );

        return manager;
    }
}