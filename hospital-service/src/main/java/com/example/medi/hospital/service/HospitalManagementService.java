package com.example.medi.hospital.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.hospital.client.BillingClient;
import com.example.medi.hospital.dto.BookHospitalAppointmentRequest;
import com.example.medi.hospital.dto.HospitalAvailableSlotResponse;
import com.example.medi.hospital.dto.HospitalDashboardResponse;
import com.example.medi.hospital.dto.SubscriptionCheckResponse;
import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.entity.HospitalBill;
import com.example.medi.hospital.entity.HospitalDoctor;
import com.example.medi.hospital.entity.HospitalDoctorAvailability;
import com.example.medi.hospital.entity.HospitalInventory;
import com.example.medi.hospital.entity.HospitalPatient;
import com.example.medi.hospital.entity.Staff;
import com.example.medi.hospital.enums.BillingStatus;
import com.example.medi.hospital.enums.HospitalAppointmentStatus;
import com.example.medi.hospital.enums.HospitalConsultationType;
import com.example.medi.hospital.enums.HospitalPaymentStatus;
import com.example.medi.hospital.repository.HospitalAppointmentRepository;
import com.example.medi.hospital.repository.HospitalBillRepository;
import com.example.medi.hospital.repository.HospitalDoctorAvailabilityRepository;
import com.example.medi.hospital.repository.HospitalDoctorRepository;
import com.example.medi.hospital.repository.HospitalInventoryRepository;
import com.example.medi.hospital.repository.HospitalPatientRepository;
import com.example.medi.hospital.repository.StaffRepository;
import com.example.medi.hospital.security.CurrentUserUtil;

@Service
public class HospitalManagementService {

	public final HospitalPatientRepository patientRepository;
	public final HospitalInventoryRepository inventoryRepository;
	public final HospitalBillRepository billRepository;
	public final StaffRepository staffRepository;
	public final BillingClient billingClient;

	private final HospitalDoctorRepository hospitalDoctorRepository;
	private final HospitalDoctorAvailabilityRepository hospitalDoctorAvailabilityRepository;
	private final HospitalAppointmentRepository hospitalAppointmentRepository;

	public HospitalManagementService(HospitalPatientRepository patientRepository, StaffRepository staffRepository,
			HospitalInventoryRepository inventoryRepository, HospitalBillRepository billRepository,
			HospitalDoctorAvailabilityRepository hospitalDoctorAvailabilityRepository,
			HospitalAppointmentRepository hospitalAppointmentRepository,
			HospitalDoctorRepository hospitalDoctorRepository, BillingClient billingClient) {

		this.patientRepository = patientRepository;
		this.staffRepository = staffRepository;
		this.inventoryRepository = inventoryRepository;
		this.billRepository = billRepository;
		this.hospitalAppointmentRepository = hospitalAppointmentRepository;
		this.hospitalDoctorAvailabilityRepository = hospitalDoctorAvailabilityRepository;
		this.hospitalDoctorRepository = hospitalDoctorRepository;
		this.billingClient = billingClient;
	}

	private void validateHospitalRole() {
		if (!"HOSPITAL".equals(CurrentUserUtil.getRole())) {
			throw new AccessDeniedException("Only HOSPITAL role allowed");
		}
	}

	public List<HospitalDoctor> getPublicHospitalDoctors() {
	    return hospitalDoctorRepository.findByActiveTrue();
	}
	@CacheEvict(value = { "hospitalDoctors", "hospitalDashboard" }, allEntries = true)
	public HospitalDoctor createHospitalDoctor(HospitalDoctor doctor) {

		validateHospitalRole();

		if (doctor.getDoctorName() == null || doctor.getDoctorName().isBlank()) {
			throw new RuntimeException("Doctor name is required");
		}

		if (doctor.getDepartment() == null || doctor.getDepartment().isBlank()) {
			throw new RuntimeException("Department is required");
		}

		doctor.setHospitalAuthUserId(CurrentUserUtil.getUserId());
		doctor.setActive(true);

		return hospitalDoctorRepository.save(doctor);
	}

	@Cacheable(value = "myHospitalDoctors", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<HospitalDoctor> getMyHospitalDoctors() {

		validateHospitalRole();

		return hospitalDoctorRepository.findByHospitalAuthUserIdAndActiveTrue(CurrentUserUtil.getUserId());
	}

	@Cacheable(value = "hospitalDoctors", key = "#hospitalId")
	public List<HospitalDoctor> getDoctorsByHospital(Long hospitalId) {
		System.out.println("DB HIT: Loading hospital doctors for hospitalId = " + hospitalId);
		return hospitalDoctorRepository.findByHospitalAuthUserIdAndActiveTrue(hospitalId);
	}

	@CacheEvict(value = { "hospitalDoctors", "myHospitalDoctors", "hospitalDashboard" }, allEntries = true)
	public HospitalDoctor updateHospitalDoctor(Long doctorId, HospitalDoctor request) {

		validateHospitalRole();

		HospitalDoctor doctor = hospitalDoctorRepository.findById(doctorId)
				.orElseThrow(() -> new RuntimeException("Hospital doctor not found"));

		if (!doctor.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your hospital doctors");
		}

		doctor.setDoctorName(request.getDoctorName());
		doctor.setSpecialization(request.getSpecialization());
		doctor.setDepartment(request.getDepartment());
		doctor.setQualification(request.getQualification());
		doctor.setExperienceYears(request.getExperienceYears());
		doctor.setMobile(request.getMobile());
		doctor.setEmail(request.getEmail());
		doctor.setConsultationFee(request.getConsultationFee());

		return hospitalDoctorRepository.save(doctor);
	}

	@CacheEvict(value = { "hospitalDoctors", "myHospitalDoctors", "hospitalDashboard" }, allEntries = true)
	public void deleteHospitalDoctor(Long doctorId) {

		validateHospitalRole();

		HospitalDoctor doctor = hospitalDoctorRepository.findById(doctorId)
				.orElseThrow(() -> new RuntimeException("Hospital doctor not found"));

		if (!doctor.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your hospital doctors");
		}

		doctor.setActive(false);
		hospitalDoctorRepository.save(doctor);
	}

	@CacheEvict(value = { "hospitalPatients", "hospitalDashboard" }, allEntries = true)
	public HospitalPatient createPatient(HospitalPatient patient) {

		validateHospitalRole();

		patient.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return patientRepository.save(patient);
	}

	@CacheEvict(value = { "hospitalStaff", "hospitalDashboard" }, allEntries = true)
	public Staff createStaff(Staff staff) {

		validateHospitalRole();

		staff.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return staffRepository.save(staff);
	}

	@CacheEvict(value = { "hospitalInventory", "hospitalDashboard" }, allEntries = true)
	public HospitalInventory createInventory(HospitalInventory inventory) {

		validateHospitalRole();

		inventory.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return inventoryRepository.save(inventory);
	}

	@CacheEvict(value = { "hospitalBills", "hospitalDashboard" }, allEntries = true)
	public HospitalBill createBill(Long patientId, HospitalBill bill) {

		validateHospitalRole();

		HospitalPatient patient = patientRepository.findById(patientId)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		bill.setHospitalAuthUserId(CurrentUserUtil.getUserId());
		bill.setPatient(patient);

		double total = (bill.getConsultationFee() == null ? 0 : bill.getConsultationFee())
				+ (bill.getMedicineCharge() == null ? 0 : bill.getMedicineCharge())
				+ (bill.getRoomCharge() == null ? 0 : bill.getRoomCharge())
				+ (bill.getOtherCharge() == null ? 0 : bill.getOtherCharge());

		bill.setTotalAmount(total);

		return billRepository.save(bill);
	}

	@Cacheable(value = "hospitalDashboard", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public HospitalDashboardResponse getDashboardCounts() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return new HospitalDashboardResponse(patientRepository.countByHospitalAuthUserId(hospitalId),
				staffRepository.countByHospitalAuthUserId(hospitalId),
				inventoryRepository.countByHospitalAuthUserId(hospitalId),
				billRepository.countByHospitalAuthUserId(hospitalId));
	}

	@Cacheable(value = "hospitalPatients", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<HospitalPatient> getPatients() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return patientRepository.findByHospitalAuthUserId(hospitalId);
	}

	@Cacheable(value = "hospitalStaff", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<Staff> getStaff() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return staffRepository.findByHospitalAuthUserId(hospitalId);
	}

	@Cacheable(value = "hospitalInventory", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<HospitalInventory> getInventory() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return inventoryRepository.findByHospitalAuthUserId(hospitalId);
	}

	@Cacheable(value = "hospitalBills", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<HospitalBill> getBills() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return billRepository.findByHospitalAuthUserId(hospitalId);
	}

	@CacheEvict(value = { "hospitalInventory", "hospitalDashboard" }, allEntries = true)
	public HospitalInventory updateInventory(Long id, HospitalInventory request) {

		validateHospitalRole();

		HospitalInventory inventory = inventoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Inventory item not found"));

		if (!inventory.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your inventory");
		}

		inventory.setItemName(request.getItemName());
		inventory.setCategory(request.getCategory());
		inventory.setQuantity(request.getQuantity());
		inventory.setMinimumQuantity(request.getMinimumQuantity());
		inventory.setUnitPrice(request.getUnitPrice());

		return inventoryRepository.save(inventory);
	}

	@CacheEvict(value = { "hospitalInventory", "hospitalDashboard" }, allEntries = true)
	public HospitalInventory useInventoryItem(Long id, Integer quantity) {

		validateHospitalRole();

		HospitalInventory inventory = inventoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Inventory item not found"));

		if (!inventory.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can use only your inventory");
		}

		if (quantity == null || quantity <= 0) {
			throw new RuntimeException("Quantity must be greater than zero");
		}

		if (inventory.getQuantity() == null || inventory.getQuantity() < quantity) {
			throw new RuntimeException("Insufficient inventory quantity");
		}

		inventory.setQuantity(inventory.getQuantity() - quantity);

		return inventoryRepository.save(inventory);
	}

	@CacheEvict(value = { "hospitalBills", "hospitalDashboard" }, allEntries = true)
	public HospitalBill markBillPaid(Long billId) {

		validateHospitalRole();

		HospitalBill bill = billRepository.findById(billId).orElseThrow(() -> new RuntimeException("Bill not found"));

		if (!bill.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your bills");
		}

		bill.setStatus(BillingStatus.PAID);

		return billRepository.save(bill);
	}

	@CacheEvict(value = { "hospitalPatients", "hospitalDashboard" }, allEntries = true)
	public HospitalPatient updatePatient(Long id, HospitalPatient request) {

		validateHospitalRole();

		HospitalPatient patient = patientRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!patient.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your patients");
		}

		patient.setPatientName(request.getPatientName());
		patient.setMobile(request.getMobile());
		patient.setGender(request.getGender());
		patient.setAge(request.getAge());
		patient.setPatientType(request.getPatientType());
		patient.setDepartment(request.getDepartment());
		patient.setDoctorName(request.getDoctorName());
		patient.setAdmissionDate(request.getAdmissionDate());
		patient.setDischargeDate(request.getDischargeDate());
		patient.setDiagnosis(request.getDiagnosis());

		return patientRepository.save(patient);
	}

	@CacheEvict(value = { "hospitalPatients", "hospitalDashboard" }, allEntries = true)
	public void deletePatient(Long id) {

		validateHospitalRole();

		HospitalPatient patient = patientRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!patient.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your patients");
		}

		patientRepository.delete(patient);
	}

	@CacheEvict(value = { "hospitalStaff", "hospitalDashboard" }, allEntries = true)
	public Staff updateStaff(Long id, Staff request) {

		validateHospitalRole();

		Staff staff = staffRepository.findById(id).orElseThrow(() -> new RuntimeException("Staff not found"));

		if (!staff.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your staff");
		}

		staff.setStaffName(request.getStaffName());
		staff.setDesignation(request.getDesignation());
		staff.setDepartment(request.getDepartment());
		staff.setMobile(request.getMobile());
		staff.setEmail(request.getEmail());
		staff.setSalary(request.getSalary());

		return staffRepository.save(staff);
	}

	@CacheEvict(value = { "hospitalStaff", "hospitalDashboard" }, allEntries = true)
	public void deleteStaff(Long id) {

		validateHospitalRole();

		Staff staff = staffRepository.findById(id).orElseThrow(() -> new RuntimeException("Staff not found"));

		if (!staff.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your staff");
		}

		staffRepository.delete(staff);
	}

	@CacheEvict(value = { "hospitalInventory", "hospitalDashboard" }, allEntries = true)
	public void deleteInventory(Long id) {

		validateHospitalRole();

		HospitalInventory inventory = inventoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Inventory item not found"));

		if (!inventory.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your inventory");
		}

		inventoryRepository.delete(inventory);
	}

	@CacheEvict(value = { "hospitalBills", "hospitalDashboard" }, allEntries = true)
	public HospitalBill updateBill(Long id, HospitalBill request) {

		validateHospitalRole();

		HospitalBill bill = billRepository.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));

		if (!bill.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your bills");
		}

		bill.setConsultationFee(request.getConsultationFee());
		bill.setMedicineCharge(request.getMedicineCharge());
		bill.setRoomCharge(request.getRoomCharge());
		bill.setOtherCharge(request.getOtherCharge());
		bill.setStatus(request.getStatus());

		double total = (request.getConsultationFee() == null ? 0 : request.getConsultationFee())
				+ (request.getMedicineCharge() == null ? 0 : request.getMedicineCharge())
				+ (request.getRoomCharge() == null ? 0 : request.getRoomCharge())
				+ (request.getOtherCharge() == null ? 0 : request.getOtherCharge());

		bill.setTotalAmount(total);

		return billRepository.save(bill);
	}

	@CacheEvict(value = { "hospitalBills", "hospitalDashboard" }, allEntries = true)
	public void deleteBill(Long id) {

		validateHospitalRole();

		HospitalBill bill = billRepository.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));

		if (!bill.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your bills");
		}

		billRepository.delete(bill);
	}

	@CacheEvict(value = { "doctorAvailability", "hospitalSlots" }, allEntries = true)
	public HospitalDoctorAvailability createDoctorAvailability(HospitalDoctorAvailability availability) {

		validateHospitalRole();

		if (availability.getHospitalDoctorId() == null) {
			throw new RuntimeException("Hospital doctor is required");
		}

		HospitalDoctor doctor = hospitalDoctorRepository.findById(availability.getHospitalDoctorId())
				.orElseThrow(() -> new RuntimeException("Hospital doctor not found"));

		if (!doctor.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("This doctor does not belong to your hospital");
		}

		if (availability.getAvailableDate() == null) {
			throw new RuntimeException("Available date is required");
		}

		if (availability.getStartTime() == null || availability.getEndTime() == null) {
			throw new RuntimeException("Start and end time are required");
		}

		if (availability.getSlotDuration() == null || availability.getSlotDuration() <= 0) {
			throw new RuntimeException("Slot duration must be greater than zero");
		}

		availability.setHospitalAuthUserId(CurrentUserUtil.getUserId());
		availability.setDoctorName(doctor.getDoctorName());
		availability.setDepartment(doctor.getDepartment());

		return hospitalDoctorAvailabilityRepository.save(availability);
	}

	@Cacheable(value = "doctorAvailability", key = "T(com.example.medi.hospital.security.CurrentUserUtil).getUserId()")
	public List<HospitalDoctorAvailability> getMyDoctorAvailability() {

		validateHospitalRole();

		return hospitalDoctorAvailabilityRepository.findByHospitalAuthUserId(CurrentUserUtil.getUserId());
	}

	@Cacheable(value = "hospitalSlots", key = "#hospitalId + '-' + #hospitalDoctorId + '-' + #date")
	public List<HospitalAvailableSlotResponse> getHospitalDoctorSlots(Long hospitalId, Long hospitalDoctorId,
			LocalDate date) {

		System.out.println("DB HIT: Loading hospital slots for hospitalId=" + hospitalId + ", doctorId="
				+ hospitalDoctorId + ", date=" + date);

		List<HospitalDoctorAvailability> availabilityList = hospitalDoctorAvailabilityRepository
				.findByHospitalAuthUserIdAndHospitalDoctorIdAndAvailableDate(hospitalId, hospitalDoctorId, date);

		List<HospitalAvailableSlotResponse> slots = new ArrayList<>();

		for (HospitalDoctorAvailability availability : availabilityList) {

			LocalTime current = availability.getStartTime();

			while (current.plusMinutes(availability.getSlotDuration()).compareTo(availability.getEndTime()) <= 0) {

				boolean booked = hospitalAppointmentRepository
						.existsByHospitalAuthUserIdAndHospitalDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
								hospitalId, hospitalDoctorId, date, current, HospitalAppointmentStatus.CANCELLED);

				slots.add(new HospitalAvailableSlotResponse(current.toString(), booked));

				current = current.plusMinutes(availability.getSlotDuration());
			}
		}

		return slots;
	}

	@CacheEvict(value = {
	        "hospitalAppointments",
	        "patientHospitalAppointments",
	        "hospitalSlots",
	        "hospitalDashboard"
	}, allEntries = true)
	public HospitalAppointment bookHospitalAppointment(BookHospitalAppointmentRequest request) {

	    if (!"PATIENT".equals(CurrentUserUtil.getRole())) {
	        throw new AccessDeniedException("Only PATIENT can book hospital appointment");
	    }

	    if (request == null) {
	        throw new RuntimeException("Appointment request is required");
	    }

	    if (request.getHospitalAuthUserId() == null) {
	        throw new RuntimeException("Hospital id is required");
	    }

	    if (request.getHospitalDoctorId() == null) {
	        throw new RuntimeException("Hospital doctor id is required");
	    }

	    if (request.getPatientName() == null || request.getPatientName().isBlank()) {
	        throw new RuntimeException("Patient name is required");
	    }

	    if (request.getPatientMobile() == null || request.getPatientMobile().isBlank()) {
	        throw new RuntimeException("Patient mobile is required");
	    }

	    if (request.getPatientEmail() == null || request.getPatientEmail().isBlank()) {
	        throw new RuntimeException("Patient email is required");
	    }

	    if (request.getAppointmentDate() == null || request.getAppointmentTime() == null) {
	        throw new RuntimeException("Appointment date and time are required");
	    }

	    HospitalConsultationType consultationType =
	            request.getConsultationType() == null
	                    ? HospitalConsultationType.OFFLINE
	                    : request.getConsultationType();

	    if (consultationType == HospitalConsultationType.ONLINE) {
	        validateHospitalOnlineConsultation(request.getHospitalAuthUserId());
	    }

	    HospitalDoctor doctor = hospitalDoctorRepository.findById(request.getHospitalDoctorId())
	            .orElseThrow(() -> new RuntimeException("Hospital doctor not found"));

	    if (!doctor.getHospitalAuthUserId().equals(request.getHospitalAuthUserId())) {
	        throw new RuntimeException("Selected doctor does not belong to selected hospital");
	    }

	    boolean booked = hospitalAppointmentRepository
	            .existsByHospitalAuthUserIdAndHospitalDoctorIdAndAppointmentDateAndAppointmentTimeAndStatusNot(
	                    request.getHospitalAuthUserId(),
	                    request.getHospitalDoctorId(),
	                    request.getAppointmentDate(),
	                    request.getAppointmentTime(),
	                    HospitalAppointmentStatus.CANCELLED
	            );

	    if (booked) {
	        throw new RuntimeException("Selected slot is already booked");
	    }

	    HospitalAppointment appointment = new HospitalAppointment();

	    appointment.setHospitalAuthUserId(request.getHospitalAuthUserId());
	    appointment.setHospitalDoctorId(request.getHospitalDoctorId());
	    appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());

	    appointment.setDoctorName(doctor.getDoctorName());
	    appointment.setDepartment(doctor.getDepartment());

	    appointment.setPatientName(request.getPatientName());
	    appointment.setPatientMobile(request.getPatientMobile());
	    appointment.setPatientEmail(request.getPatientEmail());

	    appointment.setAppointmentDate(request.getAppointmentDate());
	    appointment.setAppointmentTime(request.getAppointmentTime());
	    appointment.setSymptoms(request.getSymptoms());

	    appointment.setConsultationType(consultationType);

	    appointment.setConsultationFee(
	            doctor.getConsultationFee() == null ? 0 : doctor.getConsultationFee()
	    );

	    if (consultationType == HospitalConsultationType.ONLINE) {
	        appointment.setStatus(HospitalAppointmentStatus.PENDING);
	        appointment.setPaymentStatus(HospitalPaymentStatus.PENDING);

	        String meetingUrl = "https://meet.jit.si/medirevolution-hospital-"
	                + request.getHospitalAuthUserId()
	                + "-"
	                + request.getHospitalDoctorId()
	                + "-"
	                + System.currentTimeMillis();

	        appointment.setMeetingUrl(meetingUrl);
	    } else {
	        appointment.setStatus(HospitalAppointmentStatus.PENDING);
	        appointment.setPaymentStatus(HospitalPaymentStatus.NOT_REQUIRED);
	        appointment.setMeetingUrl(null);
	    }

	    return hospitalAppointmentRepository.save(appointment);
	}
	public List<HospitalAppointment> getHospitalAppointments() {

	    validateHospitalRole();

	    return hospitalAppointmentRepository
	            .findByHospitalAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
	}

	public List<HospitalAppointment> getPatientHospitalAppointments() {

	    return hospitalAppointmentRepository
	            .findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(CurrentUserUtil.getUserId());
	}

	@CacheEvict(value = { "hospitalAppointments", "patientHospitalAppointments", "hospitalSlots",
			"hospitalDashboard" }, allEntries = true)
	public HospitalAppointment updateHospitalAppointmentStatus(Long appointmentId, HospitalAppointmentStatus status) {

		validateHospitalRole();

		HospitalAppointment appointment = hospitalAppointmentRepository.findById(appointmentId)
				.orElseThrow(() -> new RuntimeException("Appointment not found"));

		if (!appointment.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your hospital appointments");
		}

		appointment.setStatus(status);

		return hospitalAppointmentRepository.save(appointment);
	}

	@CacheEvict(value = { "hospitalAppointments", "patientHospitalAppointments", "hospitalSlots",
			"hospitalDashboard" }, allEntries = true)
	public HospitalAppointment cancelPatientHospitalAppointment(Long appointmentId) {

		HospitalAppointment appointment = hospitalAppointmentRepository.findById(appointmentId)
				.orElseThrow(() -> new RuntimeException("Appointment not found"));

		if (!appointment.getPatientAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can cancel only your appointment");
		}

		if (appointment.getStatus() == HospitalAppointmentStatus.COMPLETED) {
			throw new RuntimeException("Completed appointment cannot be cancelled");
		}

		appointment.setStatus(HospitalAppointmentStatus.CANCELLED);

		return hospitalAppointmentRepository.save(appointment);
	}

	private void validateHospitalOnlineConsultation(Long hospitalAuthUserId) {
		SubscriptionCheckResponse subscription = billingClient.checkSubscription(hospitalAuthUserId);

		if (subscription == null || !subscription.isActive()) {
			throw new RuntimeException("Hospital subscription is not active. Please activate a plan.");
		}

		if (!Boolean.TRUE.equals(subscription.getOnlineConsultationEnabled())) {
			throw new RuntimeException("Online consultation is not available in current hospital plan.");
		}
	}
}