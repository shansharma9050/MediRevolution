package com.example.medi.auth.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;

import org.springframework.mail.javamail.MimeMessageHelper;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String fromEmail;

    @Value("${app.mail.name:MediRevolution}")
    private String fromName;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();

            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(new InternetAddress(fromEmail, fromName));
            helper.setTo(toEmail);
            helper.setSubject("Your MediRevolution Email Verification OTP");

            String html = """
                    <div style="background:#f4f7fb;padding:30px;font-family:Arial,sans-serif;">
                        <div style="max-width:600px;margin:auto;background:white;border-radius:18px;overflow:hidden;
                                    box-shadow:0 8px 28px rgba(0,0,0,0.08);">

                            <div style="background:linear-gradient(135deg,#05285f,#03bfd7);padding:28px;text-align:center;color:white;">
                                <h1 style="margin:0;">MediRevolution</h1>
                                <p style="margin:8px 0 0;">Secure Email Verification</p>
                            </div>

                            <div style="padding:32px;">
                                <h2 style="color:#05285f;">Verify your email address</h2>

                                <p style="font-size:15px;color:#374151;line-height:1.6;">
                                    Use the OTP below to verify your email address and continue registration.
                                </p>

                                <div style="text-align:center;margin:30px 0;">
                                    <span style="display:inline-block;background:#eef7ff;color:#05285f;
                                                 padding:18px 30px;border-radius:14px;font-size:34px;
                                                 letter-spacing:8px;font-weight:800;border:1px dashed #03bfd7;">
                                        %s
                                    </span>
                                </div>

                                <p style="font-size:14px;color:#6b7280;">
                                    This OTP is valid for 10 minutes. Do not share it with anyone.
                                </p>

                                <p style="font-size:13px;color:#9ca3af;">
                                    If you did not request this OTP, please ignore this email.
                                </p>
                            </div>
                        </div>
                    </div>
                    """.formatted(otp);

            helper.setText(html, true);

            mailSender.send(message);

        } catch (Exception e) {
            throw new RuntimeException("Unable to send email OTP");
        }
    }
    
    public void sendForgotPasswordOtpEmail(String toEmail, String otp) {

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject("MediRevolution Password Reset OTP");

        message.setText(
                "Dear User,\n\n" +
                "Your OTP for resetting your MediRevolution password is: " + otp + "\n\n" +
                "This OTP is valid for 10 minutes.\n\n" +
                "If you did not request password reset, please ignore this email.\n\n" +
                "Regards,\n" +
                "MediRevolution Team"
        );

        mailSender.send(message);
    }
}