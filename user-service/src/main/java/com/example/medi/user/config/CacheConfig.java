package com.example.medi.user.config;

import java.util.concurrent.TimeUnit;

import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {

        CaffeineCacheManager manager = new CaffeineCacheManager(
                "doctors",
                "hospitals",
                "doctorProfile",
                "hospitalProfile",
                "wholesalerProfile",
                "retailerProfile",
                "patientProfile"
        );

        manager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(2000)
                        .expireAfterWrite(10, TimeUnit.MINUTES)
        );

        return manager;
    }
}