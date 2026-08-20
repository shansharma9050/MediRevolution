package com.example.medi.saas.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceAccessResponse {

	private boolean allowed;
	private Long tenantId;
	private Long authUserId;
	private String message;
}