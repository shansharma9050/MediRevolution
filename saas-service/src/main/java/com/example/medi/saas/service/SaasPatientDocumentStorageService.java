package com.example.medi.saas.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
public class SaasPatientDocumentStorageService {

    private static final Set<String> ALLOWED_EXTENSIONS =
            Set.of(
                    "pdf",
                    "jpg",
                    "jpeg",
                    "png"
            );

    private static final long DEFAULT_MAX_FILE_SIZE_BYTES =
            10L * 1024L * 1024L;

    private final Path storageRoot;

    private final long maxFileSizeBytes;


    public SaasPatientDocumentStorageService(
            @Value("${patient.document.storage-dir:./data/patient-documents}")
            String storageDirectory,

            @Value("${patient.document.max-file-size-bytes:10485760}")
            long maxFileSizeBytes
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


        this.maxFileSizeBytes =
                maxFileSizeBytes > 0
                        ? maxFileSizeBytes
                        : DEFAULT_MAX_FILE_SIZE_BYTES;


        try {

            Files.createDirectories(
                    this.storageRoot
            );

        } catch (IOException exception) {

            throw new IllegalStateException(
                    "Unable to initialize patient document storage",
                    exception
            );
        }
    }


    /*
     * ================================================================
     * STORE FILE
     * ================================================================
     */

    public StoredDocumentFile store(
            Long tenantId,
            Long patientId,
            MultipartFile file
    ) {

        validateIdentifiers(
                tenantId,
                patientId
        );


        validateFile(
                file
        );


        String originalFileName =
                sanitizeOriginalFileName(
                        file.getOriginalFilename()
                );


        String extension =
                extractExtension(
                        originalFileName
                );


        String mimeType =
                normalizeMimeType(
                        file.getContentType()
                );


        validateExtension(
                extension
        );


        validateMimeType(
                extension,
                mimeType
        );


        validateFileSignature(
                file,
                extension
        );


        String storedFileName =
                UUID.randomUUID()
                        .toString()
                        .replace("-", "")
                        + "."
                        + extension;


        String relativeStorageKey =
                "tenant-"
                        + tenantId
                        + "/patient-"
                        + patientId
                        + "/"
                        + storedFileName;


        Path target =
                resolveStoragePath(
                        relativeStorageKey
                );


        try {

            Files.createDirectories(
                    target.getParent()
            );


            try (
                    InputStream inputStream =
                            file.getInputStream()
            ) {

                Files.copy(
                        inputStream,
                        target,
                        StandardCopyOption.REPLACE_EXISTING
                );
            }


        } catch (IOException exception) {

            throw new RuntimeException(
                    "Unable to store patient document",
                    exception
            );
        }


        return new StoredDocumentFile(

                relativeStorageKey,

                originalFileName,

                extension,

                mimeType,

                file.getSize()
        );
    }


    /*
     * ================================================================
     * LOAD FILE
     * ================================================================
     */

    public Resource loadAsResource(
            String storageKey
    ) {

        Path filePath =
                resolveStoragePath(
                        storageKey
                );


        if (
                !Files.exists(filePath) ||
                !Files.isRegularFile(filePath)
        ) {

            throw new RuntimeException(
                    "Patient document file not found"
            );
        }


        try {

            Resource resource =
                    new UrlResource(
                            filePath.toUri()
                    );


            if (
                    !resource.exists() ||
                    !resource.isReadable()
            ) {

                throw new RuntimeException(
                        "Patient document file is not readable"
                );
            }


            return resource;


        } catch (MalformedURLException exception) {

            throw new RuntimeException(
                    "Unable to read patient document",
                    exception
            );
        }
    }


    /*
     * ================================================================
     * DELETE MANAGED FILE
     * ================================================================
     */

    public void deleteIfManaged(
            String storageKey
    ) {

        if (
                storageKey == null ||
                storageKey.isBlank()
        ) {

            return;
        }


        try {

            Path target =
                    resolveStoragePath(
                            storageKey
                    );


            Files.deleteIfExists(
                    target
            );


        } catch (RuntimeException | IOException exception) {

            /*
             * Metadata delete must not fail only because physical cleanup
             * was not possible.
             */
        }
    }


    /*
     * ================================================================
     * FILE VALIDATION
     * ================================================================
     */

    private void validateFile(
            MultipartFile file
    ) {

        if (
                file == null ||
                file.isEmpty()
        ) {

            throw new RuntimeException(
                    "Document file is required"
            );
        }


        if (file.getSize() <= 0) {

            throw new RuntimeException(
                    "Document file is empty"
            );
        }


        if (
                file.getSize()
                        > maxFileSizeBytes
        ) {

            throw new RuntimeException(
                    "Document file size exceeds maximum allowed size of "
                            + (
                                    maxFileSizeBytes
                                            / 1024
                                            / 1024
                            )
                            + " MB"
            );
        }
    }


    private void validateExtension(
            String extension
    ) {

        if (
                extension == null ||
                !ALLOWED_EXTENSIONS.contains(
                        extension
                )
        ) {

            throw new RuntimeException(
                    "Only PDF, JPG, JPEG and PNG documents are allowed"
            );
        }
    }


    private void validateMimeType(
            String extension,
            String mimeType
    ) {

        if (
                mimeType == null ||
                mimeType.isBlank()
        ) {

            throw new RuntimeException(
                    "Document content type is required"
            );
        }


        boolean valid =
                switch (extension) {

                    case "pdf" ->
                            "application/pdf"
                                    .equals(
                                            mimeType
                                    );

                    case "jpg",
                         "jpeg" ->
                            "image/jpeg"
                                    .equals(
                                            mimeType
                                    );

                    case "png" ->
                            "image/png"
                                    .equals(
                                            mimeType
                                    );

                    default ->
                            false;
                };


        if (!valid) {

            throw new RuntimeException(
                    "Document extension does not match content type"
            );
        }
    }


    /*
     * ================================================================
     * BASIC FILE SIGNATURE VALIDATION
     * ================================================================
     */

    private void validateFileSignature(
            MultipartFile file,
            String extension
    ) {

        byte[] header =
                new byte[12];


        int bytesRead;


        try (
                InputStream inputStream =
                        file.getInputStream()
        ) {

            bytesRead =
                    inputStream.read(
                            header
                    );


        } catch (IOException exception) {

            throw new RuntimeException(
                    "Unable to validate document file",
                    exception
            );
        }


        if (bytesRead <= 0) {

            throw new RuntimeException(
                    "Unable to read document file"
            );
        }


        boolean valid =
                switch (extension) {

                    case "pdf" ->
                            isPdf(
                                    header,
                                    bytesRead
                            );

                    case "jpg",
                         "jpeg" ->
                            isJpeg(
                                    header,
                                    bytesRead
                            );

                    case "png" ->
                            isPng(
                                    header,
                                    bytesRead
                            );

                    default ->
                            false;
                };


        if (!valid) {

            throw new RuntimeException(
                    "Document file content is invalid"
            );
        }
    }


    private boolean isPdf(
            byte[] header,
            int length
    ) {

        return length >= 5
                && header[0] == '%'
                && header[1] == 'P'
                && header[2] == 'D'
                && header[3] == 'F'
                && header[4] == '-';
    }


    private boolean isJpeg(
            byte[] header,
            int length
    ) {

        return length >= 3
                && (
                        header[0] & 0xFF
                ) == 0xFF
                && (
                        header[1] & 0xFF
                ) == 0xD8
                && (
                        header[2] & 0xFF
                ) == 0xFF;
    }


    private boolean isPng(
            byte[] header,
            int length
    ) {

        return length >= 8
                && (
                        header[0] & 0xFF
                ) == 0x89
                && header[1] == 0x50
                && header[2] == 0x4E
                && header[3] == 0x47
                && header[4] == 0x0D
                && header[5] == 0x0A
                && header[6] == 0x1A
                && header[7] == 0x0A;
    }


    /*
     * ================================================================
     * PATH SECURITY
     * ================================================================
     */

    private Path resolveStoragePath(
            String storageKey
    ) {

        if (
                storageKey == null ||
                storageKey.isBlank()
        ) {

            throw new RuntimeException(
                    "Document storage key is required"
            );
        }


        Path resolved =
                storageRoot
                        .resolve(
                                storageKey
                        )
                        .normalize();


        if (
                !resolved.startsWith(
                        storageRoot
                )
        ) {

            throw new RuntimeException(
                    "Invalid document storage path"
            );
        }


        return resolved;
    }


    /*
     * ================================================================
     * FILENAME HELPERS
     * ================================================================
     */

    private String sanitizeOriginalFileName(
            String originalFileName
    ) {

        if (
                originalFileName == null ||
                originalFileName.isBlank()
        ) {

            throw new RuntimeException(
                    "Document file name is required"
            );
        }


        String normalized =
                originalFileName
                        .replace(
                                "\\",
                                "/"
                        );


        int lastSlash =
                normalized.lastIndexOf('/');


        if (lastSlash >= 0) {

            normalized =
                    normalized.substring(
                            lastSlash + 1
                    );
        }


        normalized =
                normalized
                        .replaceAll(
                                "[\\r\\n\\t]",
                                "_"
                        )
                        .trim();


        if (normalized.isBlank()) {

            throw new RuntimeException(
                    "Invalid document file name"
            );
        }


        if (normalized.length() > 255) {

            normalized =
                    normalized.substring(
                            normalized.length() - 255
                    );
        }


        return normalized;
    }


    private String extractExtension(
            String fileName
    ) {

        int index =
                fileName.lastIndexOf('.');


        if (
                index < 0 ||
                index ==
                        fileName.length() - 1
        ) {

            throw new RuntimeException(
                    "Document file extension is required"
            );
        }


        return fileName
                .substring(
                        index + 1
                )
                .toLowerCase(
                        Locale.ROOT
                );
    }


    private String normalizeMimeType(
            String mimeType
    ) {

        if (mimeType == null) {

            return null;
        }


        String value =
                mimeType
                        .trim()
                        .toLowerCase(
                                Locale.ROOT
                        );


        int separator =
                value.indexOf(';');


        if (separator >= 0) {

            value =
                    value.substring(
                            0,
                            separator
                    )
                    .trim();
        }


        return value;
    }


    private void validateIdentifiers(
            Long tenantId,
            Long patientId
    ) {

        if (tenantId == null) {

            throw new RuntimeException(
                    "tenantId is required"
            );
        }


        if (patientId == null) {

            throw new RuntimeException(
                    "patientId is required"
            );
        }
    }


    /*
     * ================================================================
     * STORED FILE RESULT
     * ================================================================
     */

    public record StoredDocumentFile(

            String storageKey,

            String originalFileName,

            String extension,

            String mimeType,

            long fileSizeBytes

    ) {
    }
}