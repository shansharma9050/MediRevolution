package com.example.medi.billing.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class WorkspaceAccessResponse {

	private boolean allowed;

	private Long tenantId;

	private Long authUserId;

	private String message;
}