package com.example.medi.medicine.config;

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

        CaffeineCacheManager manager =
                new CaffeineCacheManager(
                        "medicines",
                        "medicineSearch",
                        "medicineById",

                        "myStock",
                        "stockSearch",
                        "stockById",

                        "wholesalerDashboard"
                );

        manager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(5000)
                        .expireAfterWrite(10, TimeUnit.MINUTES)
        );

        return manager;
    }
}