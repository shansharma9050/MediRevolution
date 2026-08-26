package com.example.medi.saas.exception;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

@RestControllerAdvice
public class GlobalExceptionHandler {

	/*
	 * ============================================================ ACCESS DENIED /
	 * FORBIDDEN ============================================================
	 */
	@ExceptionHandler(AccessDeniedException.class)
	public ResponseEntity<Map<String, Object>> handleAccessDenied(AccessDeniedException ex,
			HttpServletRequest request) {

		String message = ex.getMessage();

		if (message == null || message.isBlank()) {
			message = "Access denied";
		}

		Map<String, Object> body = new LinkedHashMap<>();

		body.put("status", HttpStatus.FORBIDDEN.value());
		body.put("error", HttpStatus.FORBIDDEN.getReasonPhrase());
		body.put("message", message);
		body.put("path", request.getRequestURI());
		body.put("timestamp", LocalDateTime.now());

		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(body);
	}

	/*
	 * ============================================================ GENERAL RUNTIME
	 * EXCEPTION ============================================================
	 */
	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex, HttpServletRequest request) {

		String message = ex.getMessage();

		if (message == null || message.isBlank()) {
			message = "Unexpected server error";
		}

		Map<String, Object> body = new LinkedHashMap<>();

		body.put("status", HttpStatus.BAD_REQUEST.value());
		body.put("error", HttpStatus.BAD_REQUEST.getReasonPhrase());
		body.put("message", message);
		body.put("path", request.getRequestURI());
		body.put("timestamp", LocalDateTime.now());

		return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(body);
	}

	/*
	 * ============================================================ FALLBACK
	 * ============================================================
	 */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<Map<String, Object>> handleException(Exception ex, HttpServletRequest request) {

		String message = ex.getMessage();

		if (message == null || message.isBlank()) {
			message = "Internal server error";
		}

		Map<String, Object> body = new LinkedHashMap<>();

		body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
		body.put("error", HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());
		body.put("message", message);
		body.put("path", request.getRequestURI());
		body.put("timestamp", LocalDateTime.now());

		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(body);
	}
}