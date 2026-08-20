package com.example.medi.billing.service;

import java.util.Map;

public class PhonePePaymentStatus {

	private final String state;

	private final String transactionId;

	private final Map<?, ?> rawResponse;

	public PhonePePaymentStatus(String state, String transactionId, Map<?, ?> rawResponse) {
		this.state = state;
		this.transactionId = transactionId;
		this.rawResponse = rawResponse;
	}

	public String getState() {
		return state;
	}

	public String getTransactionId() {
		return transactionId;
	}

	public Map<?, ?> getRawResponse() {
		return rawResponse;
	}
}