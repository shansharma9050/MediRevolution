package com.example.medi.saas.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;

@Service
public class SaasPatientDocumentTenantCleanupService {

    private final Path storageRoot;


    public SaasPatientDocumentTenantCleanupService(
            @Value("${patient.document.storage-dir:./data/patient-documents}")
            String storageDirectory
    ) {

        if (
                storageDirectory == null ||
                storageDirectory.isBlank()
        ) {

            throw new IllegalArgumentException(
                    "Patient document storage directory is required"
            );
        }


        this.storageRoot =
                Path.of(
                        storageDirectory
                )
                .toAbsolutePath()
                .normalize();
    }


    /*
     * ================================================================
     * DELETE COMPLETE TENANT DOCUMENT DIRECTORY
     * ================================================================
     *
     * This is intentionally best-effort.
     *
     * Database workspace deletion must not fail only because an old
     * filesystem file cannot be removed. Any such file is already
     * inaccessible after tenant metadata deletion.
     */

    public void deleteTenantDocuments(
            Long tenantId
    ) {

        if (
                tenantId == null ||
                tenantId <= 0
        ) {

            return;
        }


        Path tenantDirectory =
                storageRoot
                        .resolve(
                                "tenant-" + tenantId
                        )
                        .normalize();


        /*
         * Absolute path traversal protection.
         */

        if (
                !tenantDirectory.startsWith(
                        storageRoot
                )
        ) {

            return;
        }


        if (
                !Files.exists(
                        tenantDirectory
                )
        ) {

            return;
        }


        try (
                var paths =
                        Files.walk(
                                tenantDirectory
                        )
        ) {

            paths
                    .sorted(
                            Comparator.reverseOrder()
                    )
                    .forEach(
                            path -> {

                                try {

                                    Files.deleteIfExists(
                                            path
                                    );

                                } catch (IOException ignored) {

                                    /*
                                     * Best-effort cleanup.
                                     */
                                }
                            }
                    );


        } catch (IOException ignored) {

            /*
             * Workspace database cleanup remains authoritative.
             */
        }
    }
}