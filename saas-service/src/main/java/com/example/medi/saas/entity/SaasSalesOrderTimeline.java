package com.example.medi.saas.entity;

import com.example.medi.saas.enums.SaasSalesOrderTimelineType;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "saas_sales_order_timeline", indexes = {
		@Index(name = "idx_saas_sales_order_timeline_order", columnList = "tenant_id,order_id") })
@Data
@NoArgsConstructor
public class SaasSalesOrderTimeline {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(name = "tenant_id", nullable = false)
	private Long tenantId;

	@Column(name = "order_id", nullable = false)
	private Long orderId;

	@Enumerated(EnumType.STRING)
	@Column(name = "timeline_type", nullable = false, length = 40)
	private SaasSalesOrderTimelineType timelineType;

	@Column(name = "status_label", nullable = false, length = 100)
	private String statusLabel;

	@Column(length = 500)
	private String remarks;

	@Column(name = "reference_id")
	private Long referenceId;

	@Column(name = "created_by_auth_user_id")
	private Long createdByAuthUserId;

	@Column(name = "created_at", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@PrePersist
	public void prePersist() {

		if (createdAt == null) {
			createdAt = LocalDateTime.now();
		}
	}
}