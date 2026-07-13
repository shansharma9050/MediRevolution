package com.example.medi.billing.dto;


public class SubscribePlanResponse {

	 private boolean success;
	    private String message;
	    private Long paymentId;
	    private String merchantOrderId;
	    private String redirectUrl;

	    public SubscribePlanResponse() {
	    }

	    public SubscribePlanResponse(
	            boolean success,
	            String message,
	            Long paymentId,
	            String merchantOrderId,
	            String redirectUrl
	    ) {
	        this.success = success;
	        this.message = message;
	        this.paymentId = paymentId;
	        this.merchantOrderId = merchantOrderId;
	        this.redirectUrl = redirectUrl;
	    }

	    public boolean isSuccess() {
	        return success;
	    }

	    public String getMessage() {
	        return message;
	    }

	    public Long getPaymentId() {
	        return paymentId;
	    }

	    public String getMerchantOrderId() {
	        return merchantOrderId;
	    }

	    public String getRedirectUrl() {
	        return redirectUrl;
	    }

	    public void setSuccess(boolean success) {
	        this.success = success;
	    }

	    public void setMessage(String message) {
	        this.message = message;
	    }

	    public void setPaymentId(Long paymentId) {
	        this.paymentId = paymentId;
	    }

	    public void setMerchantOrderId(String merchantOrderId) {
	        this.merchantOrderId = merchantOrderId;
	    }

	    public void setRedirectUrl(String redirectUrl) {
	        this.redirectUrl = redirectUrl;
	    }
}