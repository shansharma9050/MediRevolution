package com.example.medi.hospital.exception;

import java.nio.file.AccessDeniedException;
import java.time.LocalDateTime;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

	 @ExceptionHandler(AccessDeniedException.class)
	    public ResponseEntity<?> handleAccessDenied(
	            AccessDeniedException ex,
	            HttpServletRequest request
	    ) {
	        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
	                "status", 403,
	                "message", ex.getMessage(),
	                "path", request.getRequestURI(),
	                "timestamp", LocalDateTime.now()
	        ));
	    }

	    @ExceptionHandler(RuntimeException.class)
	    public ResponseEntity<?> handleRuntime(
	            RuntimeException ex,
	            HttpServletRequest request
	    ) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
	                "status", 400,
	                "message", ex.getMessage(),
	                "path", request.getRequestURI(),
	                "timestamp", LocalDateTime.now()
	        ));
	    }
}


