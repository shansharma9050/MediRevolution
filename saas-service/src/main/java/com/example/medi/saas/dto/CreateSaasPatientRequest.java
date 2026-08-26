package com.example.medi.saas.dto;

public class CreateSaasPatientRequest {

	private String fullName;
	private String email;
	private String mobile;
	private String password;

	public CreateSaasPatientRequest() {
	}

	public CreateSaasPatientRequest(String fullName, String email, String mobile, String password) {

		this.fullName = fullName;
		this.email = email;
		this.mobile = mobile;
		this.password = password;
	}

	public String getFullName() {
		return fullName;
	}

	public void setFullName(String fullName) {
		this.fullName = fullName;
	}

	public String getEmail() {
		return email;
	}

	public void setEmail(String email) {
		this.email = email;
	}

	public String getMobile() {
		return mobile;
	}

	public void setMobile(String mobile) {
		this.mobile = mobile;
	}

	public String getPassword() {
		return password;
	}

	public void setPassword(String password) {
		this.password = password;
	}
}