package com.example.medi.order.config;

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
                        "myOrders",
                        "orderByNo",
                        "orderDashboard"
                );

        manager.setCaffeine(
                Caffeine.newBuilder()
                        .maximumSize(3000)
                        .expireAfterWrite(5, TimeUnit.MINUTES)
        );

        return manager;
    }
}