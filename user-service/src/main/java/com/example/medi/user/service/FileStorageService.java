package com.example.medi.user.service;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.example.medi.user.dto.FileUploadResponse;
import com.example.medi.user.security.CurrentUserUtil;

import java.io.IOException;
import java.nio.file.*;
import java.util.Set;
import java.util.UUID;

@Service
public class FileStorageService {

    @Value("${file.upload-dir}")
    private String uploadDir;

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    private static final Set<String> ALLOWED_DOCUMENT_TYPES = Set.of(
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "image/webp"
    );

    public FileUploadResponse uploadLogo(MultipartFile file) {
        validateFile(file, ALLOWED_IMAGE_TYPES, "Only PNG, JPG, JPEG, WEBP logo files are allowed");
        return store(file, "logos");
    }

    public FileUploadResponse uploadDocument(MultipartFile file) {
        validateFile(file, ALLOWED_DOCUMENT_TYPES, "Only PDF or image documents are allowed");
        return store(file, "documents");
    }

    private FileUploadResponse store(MultipartFile file, String folder) {

        try {
            Long userId = CurrentUserUtil.getUserId();

            String originalFileName = file.getOriginalFilename();
            String extension = getExtension(originalFileName);

            String newFileName = UUID.randomUUID() + extension;

            Path uploadPath = Paths.get(uploadDir, folder, String.valueOf(userId))
                    .toAbsolutePath()
                    .normalize();

            Files.createDirectories(uploadPath);

            Path targetPath = uploadPath.resolve(newFileName);

            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = "/users/files/view/" + folder + "/" + userId + "/" + newFileName;

            return new FileUploadResponse(
                    newFileName,
                    fileUrl,
                    file.getContentType(),
                    file.getSize()
            );

        } catch (IOException e) {
            throw new RuntimeException("File upload failed");
        }
    }

    private void validateFile(MultipartFile file, Set<String> allowedTypes, String message) {

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }

        if (!allowedTypes.contains(file.getContentType())) {
            throw new RuntimeException(message);
        }

        if (file.getSize() > 10 * 1024 * 1024) {
            throw new RuntimeException("File size must be less than 10MB");
        }
    }

    private String getExtension(String fileName) {

        if (fileName == null || !fileName.contains(".")) {
            return "";
        }

        return fileName.substring(fileName.lastIndexOf("."));
    }
}
