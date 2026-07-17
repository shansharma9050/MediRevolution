package com.example.medi.saas.controller;

import com.example.medi.saas.dto.SaasPartyLedgerResponse;
import com.example.medi.saas.dto.SaasPartyOutstandingResponse;
import com.example.medi.saas.service.SaasPartyLedgerService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/saas/ledgers")
public class SaasLedgerController {

	private final SaasPartyLedgerService ledgerService;

	public SaasLedgerController(SaasPartyLedgerService ledgerService) {
		this.ledgerService = ledgerService;
	}

	@GetMapping("/party")
	public SaasPartyLedgerResponse getPartyLedger(@RequestParam Long tenantId,

			@RequestParam String partyType,

			@RequestParam Long partyId) {

		return ledgerService.getPartyLedger(tenantId, partyType, partyId);
	}

	@GetMapping("/outstanding")
	public List<SaasPartyOutstandingResponse> getOutstandingParties(@RequestParam Long tenantId,

			@RequestParam String partyType) {

		return ledgerService.getOutstandingParties(tenantId, partyType);
	}
}