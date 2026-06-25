package com.example.medi.hospital.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.medi.hospital.dto.BookHospitalVideoAppointmentRequest;
import com.example.medi.hospital.dto.HospitalPaymentStartResponse;
import com.example.medi.hospital.dto.HospitalPaymentVerifyResponse;
import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.service.HospitalAppointmentPaymentService;

@RestController
@RequestMapping("/hospital/payments")
public class HospitalPaymentController {

    private final HospitalAppointmentPaymentService paymentService;

    public HospitalPaymentController(HospitalAppointmentPaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/video-appointment")
    public HospitalPaymentStartResponse bookVideoAppointmentAndStartPayment(
            @RequestBody BookHospitalVideoAppointmentRequest request
    ) {
        return paymentService.bookVideoAppointmentAndStartPayment(request);
    }

    /*
     * Common payment-success page calls this API.
     */
    @PostMapping("/verify")
    public HospitalPaymentVerifyResponse verifyHospitalPaymentPost(
            @RequestParam Long appointmentId,
            @RequestParam String merchantOrderId
    ) {
        return paymentService.verifyHospitalPayment(appointmentId, merchantOrderId);
    }

    /*
     * Optional: browser/direct testing ke liye GET bhi rakho.
     */
    @GetMapping("/verify")
    public HospitalPaymentVerifyResponse verifyHospitalPaymentGet(
            @RequestParam Long appointmentId,
            @RequestParam String merchantOrderId
    ) {
        return paymentService.verifyHospitalPayment(appointmentId, merchantOrderId);
    }

    /*
     * Old fallback API, agar kahin use ho raha ho.
     */
    @PutMapping("/success")
    public HospitalAppointment markPaymentSuccess(
            @RequestParam String merchantOrderId,
            @RequestParam(required = false) String transactionId
    ) {
        return paymentService.markPaymentSuccess(merchantOrderId, transactionId);
    }

    @PutMapping("/failed")
    public HospitalAppointment markPaymentFailed(
            @RequestParam String merchantOrderId
    ) {
        return paymentService.markPaymentFailed(merchantOrderId);
    }
}