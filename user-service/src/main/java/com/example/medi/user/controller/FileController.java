package com.example.medi.user.controller;

import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import com.example.medi.user.dto.FileUploadResponse;
import com.example.medi.user.service.FileStorageService;

import org.springframework.beans.factory.annotation.Value;

import java.net.MalformedURLException;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/users/files")
public class FileController {

    private final FileStorageService fileStorageService;

    @Value("${file.upload-dir}")
    private String uploadDir;

    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping("/upload/logo")
    public FileUploadResponse uploadLogo(@RequestParam("file") MultipartFile file) {
        return fileStorageService.uploadLogo(file);
    }

    @PostMapping("/upload/document")
    public FileUploadResponse uploadDocument(@RequestParam("file") MultipartFile file) {
        return fileStorageService.uploadDocument(file);
    }

    @GetMapping("/view/{folder}/{userId}/{fileName}")
    public ResponseEntity<Resource> viewFile(
            @PathVariable String folder,
            @PathVariable Long userId,
            @PathVariable String fileName
    ) throws MalformedURLException {

        Path filePath = Paths.get(uploadDir, folder, String.valueOf(userId), fileName)
                .toAbsolutePath()
                .normalize();

        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists()) {
            throw new RuntimeException("File not found");
        }

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(resource);
    }
}