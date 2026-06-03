package com.example.medi.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminDashboardCountResponse {

    private long pendingApprovals;
    private long totalUsers;
    private long approvedUsers;
    private long rejectedUsers;

}
