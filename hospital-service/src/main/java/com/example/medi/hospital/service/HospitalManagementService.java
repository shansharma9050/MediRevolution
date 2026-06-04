package com.example.medi.hospital.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import com.example.medi.hospital.dto.BookHospitalAppointmentRequest;
import com.example.medi.hospital.dto.HospitalAvailableSlotResponse;
import com.example.medi.hospital.dto.HospitalDashboardResponse;
import com.example.medi.hospital.entity.HospitalAppointment;
import com.example.medi.hospital.entity.HospitalBill;
import com.example.medi.hospital.entity.HospitalDoctorAvailability;
import com.example.medi.hospital.entity.HospitalInventory;
import com.example.medi.hospital.entity.HospitalPatient;
import com.example.medi.hospital.entity.Staff;
import com.example.medi.hospital.enums.BillingStatus;
import com.example.medi.hospital.enums.HospitalAppointmentStatus;
import com.example.medi.hospital.repository.HospitalAppointmentRepository;
import com.example.medi.hospital.repository.HospitalBillRepository;
import com.example.medi.hospital.repository.HospitalDoctorAvailabilityRepository;
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

	private final HospitalDoctorAvailabilityRepository hospitalDoctorAvailabilityRepository;
	private final HospitalAppointmentRepository hospitalAppointmentRepository;

	public HospitalManagementService(HospitalPatientRepository patientRepository, StaffRepository staffRepository,
			HospitalInventoryRepository inventoryRepository, HospitalBillRepository billRepository,
			HospitalDoctorAvailabilityRepository hospitalDoctorAvailabilityRepository,
			HospitalAppointmentRepository hospitalAppointmentRepository) {

		this.patientRepository = patientRepository;
		this.staffRepository = staffRepository;
		this.inventoryRepository = inventoryRepository;
		this.billRepository = billRepository;
		this.hospitalAppointmentRepository=hospitalAppointmentRepository;
		this.hospitalDoctorAvailabilityRepository=hospitalDoctorAvailabilityRepository;

	}

	private void validateHospitalRole() {

		if (!"HOSPITAL".equals(CurrentUserUtil.getRole())) {

			throw new AccessDeniedException("Only HOSPITAL role allowed");
		}
	}

	public HospitalPatient createPatient(HospitalPatient patient) {

		validateHospitalRole();

		patient.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return patientRepository.save(patient);
	}

	public Staff createStaff(Staff staff) {

		validateHospitalRole();

		staff.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return staffRepository.save(staff);
	}

	public HospitalInventory createInventory(HospitalInventory inventory) {

		validateHospitalRole();

		inventory.setHospitalAuthUserId(CurrentUserUtil.getUserId());

		return inventoryRepository.save(inventory);
	}

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

	public HospitalDashboardResponse getDashboardCounts() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return new HospitalDashboardResponse(

				patientRepository.countByHospitalAuthUserId(hospitalId),

				staffRepository.countByHospitalAuthUserId(hospitalId),

				inventoryRepository.countByHospitalAuthUserId(hospitalId),

				billRepository.countByHospitalAuthUserId(hospitalId));
	}

	/*
	 * ====================================Get
	 * Methods==============================================
	 */

	public List<HospitalPatient> getPatients() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return patientRepository.findByHospitalAuthUserId(hospitalId);
	}

	public List<Staff> getStaff() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return staffRepository.findByHospitalAuthUserId(hospitalId);
	}

	public List<HospitalInventory> getInventory() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return inventoryRepository.findByHospitalAuthUserId(hospitalId);
	}

	public List<HospitalBill> getBills() {

		validateHospitalRole();

		Long hospitalId = CurrentUserUtil.getUserId();

		return billRepository.findByHospitalAuthUserId(hospitalId);
	}

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

	public HospitalBill markBillPaid(Long billId) {

		validateHospitalRole();

		HospitalBill bill = billRepository.findById(billId).orElseThrow(() -> new RuntimeException("Bill not found"));

		if (!bill.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can update only your bills");
		}

		bill.setStatus(BillingStatus.PAID);

		return billRepository.save(bill);
	}

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

	public void deletePatient(Long id) {

		validateHospitalRole();

		HospitalPatient patient = patientRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Patient not found"));

		if (!patient.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your patients");
		}

		patientRepository.delete(patient);
	}

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

	public void deleteStaff(Long id) {

		validateHospitalRole();

		Staff staff = staffRepository.findById(id).orElseThrow(() -> new RuntimeException("Staff not found"));

		if (!staff.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your staff");
		}

		staffRepository.delete(staff);
	}

	public void deleteInventory(Long id) {

		validateHospitalRole();

		HospitalInventory inventory = inventoryRepository.findById(id)
				.orElseThrow(() -> new RuntimeException("Inventory item not found"));

		if (!inventory.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your inventory");
		}

		inventoryRepository.delete(inventory);
	}

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

	public void deleteBill(Long id) {

		validateHospitalRole();

		HospitalBill bill = billRepository.findById(id).orElseThrow(() -> new RuntimeException("Bill not found"));

		if (!bill.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
			throw new AccessDeniedException("You can delete only your bills");
		}

		billRepository.delete(bill);
	}
	
	public HospitalDoctorAvailability createDoctorAvailability(HospitalDoctorAvailability availability) {

	    validateHospitalRole();

	    if (availability.getDoctorName() == null || availability.getDoctorName().isBlank()) {
	        throw new RuntimeException("Doctor name is required");
	    }

	    if (availability.getDepartment() == null || availability.getDepartment().isBlank()) {
	        throw new RuntimeException("Department is required");
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

	    return hospitalDoctorAvailabilityRepository.save(availability);
	}
	
	public List<HospitalDoctorAvailability> getMyDoctorAvailability() {

	    validateHospitalRole();

	    return hospitalDoctorAvailabilityRepository.findByHospitalAuthUserId(
	            CurrentUserUtil.getUserId()
	    );
	}
	
	public List<HospitalAvailableSlotResponse> getHospitalDoctorSlots(
	        Long hospitalId,
	        String doctorName,
	        LocalDate date
	) {
	    List<HospitalDoctorAvailability> availabilityList =
	            hospitalDoctorAvailabilityRepository
	                    .findByHospitalAuthUserIdAndDoctorNameAndAvailableDate(
	                            hospitalId,
	                            doctorName,
	                            date
	                    );

	    List<HospitalAvailableSlotResponse> slots = new ArrayList<>();

	    for (HospitalDoctorAvailability availability : availabilityList) {

	        LocalTime current = availability.getStartTime();

	        while (current.plusMinutes(availability.getSlotDuration()).compareTo(availability.getEndTime()) <= 0) {

	            boolean booked =
	                    hospitalAppointmentRepository
	                            .existsByHospitalAuthUserIdAndDoctorNameAndAppointmentDateAndAppointmentTimeAndStatusNot(
	                                    hospitalId,
	                                    doctorName,
	                                    date,
	                                    current,
	                                    HospitalAppointmentStatus.CANCELLED
	                            );

	            slots.add(new HospitalAvailableSlotResponse(current.toString(), booked));

	            current = current.plusMinutes(availability.getSlotDuration());
	        }
	    }

	    return slots;
	}
	
	public HospitalAppointment bookHospitalAppointment(BookHospitalAppointmentRequest request) {

	    if (request.getHospitalAuthUserId() == null) {
	        throw new RuntimeException("Hospital id is required");
	    }

	    if (request.getDoctorName() == null || request.getDoctorName().isBlank()) {
	        throw new RuntimeException("Doctor name is required");
	    }

	    if (request.getAppointmentDate() == null || request.getAppointmentTime() == null) {
	        throw new RuntimeException("Appointment date and time are required");
	    }

	    boolean booked =
	            hospitalAppointmentRepository
	                    .existsByHospitalAuthUserIdAndDoctorNameAndAppointmentDateAndAppointmentTimeAndStatusNot(
	                            request.getHospitalAuthUserId(),
	                            request.getDoctorName(),
	                            request.getAppointmentDate(),
	                            request.getAppointmentTime(),
	                            HospitalAppointmentStatus.CANCELLED
	                    );

	    if (booked) {
	        throw new RuntimeException("Selected slot is already booked");
	    }

	    HospitalAppointment appointment = new HospitalAppointment();
	    appointment.setHospitalAuthUserId(request.getHospitalAuthUserId());
	    appointment.setPatientAuthUserId(CurrentUserUtil.getUserId());
	    appointment.setDoctorName(request.getDoctorName());
	    appointment.setDepartment(request.getDepartment());
	    appointment.setPatientName(request.getPatientName());
	    appointment.setPatientMobile(request.getPatientMobile());
	    appointment.setAppointmentDate(request.getAppointmentDate());
	    appointment.setAppointmentTime(request.getAppointmentTime());
	    appointment.setSymptoms(request.getSymptoms());
	    appointment.setStatus(HospitalAppointmentStatus.PENDING);

	    return hospitalAppointmentRepository.save(appointment);
	}
	
	public List<HospitalAppointment> getHospitalAppointments() {

	    validateHospitalRole();

	    return hospitalAppointmentRepository
	            .findByHospitalAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(
	                    CurrentUserUtil.getUserId()
	            );
	}
	
	public List<HospitalAppointment> getPatientHospitalAppointments() {

	    return hospitalAppointmentRepository
	            .findByPatientAuthUserIdOrderByAppointmentDateDescAppointmentTimeDesc(
	                    CurrentUserUtil.getUserId()
	            );
	}
	
	public HospitalAppointment updateHospitalAppointmentStatus(
	        Long appointmentId,
	        HospitalAppointmentStatus status
	) {
	    validateHospitalRole();

	    HospitalAppointment appointment = hospitalAppointmentRepository.findById(appointmentId)
	            .orElseThrow(() -> new RuntimeException("Appointment not found"));

	    if (!appointment.getHospitalAuthUserId().equals(CurrentUserUtil.getUserId())) {
	        throw new AccessDeniedException("You can update only your hospital appointments");
	    }

	    appointment.setStatus(status);

	    return hospitalAppointmentRepository.save(appointment);
	}

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
}
