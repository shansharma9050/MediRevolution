"use strict";

/*
 * ============================================================
 * PATIENT APPOINTMENT LIFECYCLE
 * ============================================================
 *
 * Loaded after saas-patient-my-appointments.js.
 */


function renderPatientAppointments(
	appointments
) {

	const tbody =
		document.getElementById(
			"patientAppointmentsBody"
		);


	if (!tbody) {
		return;
	}


	const list =
		Array.isArray(
			appointments
		)
			? appointments
			: [];


	if (!list.length) {

		tbody.innerHTML = `
			<tr>

				<td
					colspan="8"
					class="text-center py-5">

					<i
						class="bi bi-calendar-x"
						style="font-size:42px;">
					</i>

					<div
						class="mt-3 fw-bold text-primary">

						No appointments found

					</div>

					<div class="text-muted">

						You have not booked any appointment
						in this workspace yet.

					</div>

				</td>

			</tr>
		`;

		return;
	}


	tbody.innerHTML =
		list
			.map(
				function(appointment) {

					const appointmentId =
						Number(
							appointment.id
						);


					const expired =
						isAppointmentExpired(
							appointment.appointmentDate,
							appointment.appointmentTime
						);


					const status =
						String(
							appointment.status || ""
						)
							.toUpperCase();


					const appointmentType =
						String(
							appointment.appointmentType || ""
						)
							.toUpperCase();


					const paymentStatus =
						String(
							appointment.paymentStatus || ""
						)
							.toUpperCase();


					const meetingUrl =
						getSafeHttpUrl(
							appointment.meetingUrl
						);


					let meetingHtml =
						"-";


					if (
						!expired &&
						appointmentType === "ONLINE" &&
						(
							status === "CONFIRMED" ||
							status === "IN_CONSULTATION"
						) &&
						meetingUrl
					) {

						const meetingLabel =
							status === "IN_CONSULTATION"
								? "Rejoin"
								: "Join";


						meetingHtml = `
							<a
								href="${escapeAttribute(meetingUrl)}"
								target="_blank"
								rel="noopener noreferrer"
								class="patient-join-meeting-btn">

								<i class="bi bi-camera-video-fill"></i>
								${meetingLabel}

							</a>
						`;
					}


					let actionHtml =
						"-";


					const paidOnline =
						appointmentType === "ONLINE" &&
						paymentStatus === "SUCCESS";


					const patientCanCancel =
						!expired &&
						(
							status === "REQUESTED" ||
							status === "PENDING" ||
							status === "CONFIRMED"
						) &&
						!paidOnline;


					if (patientCanCancel) {

						actionHtml = `
							<button
								type="button"
								class="btn btn-sm btn-outline-danger"
								onclick="cancelPatientAppointment(${appointmentId})">

								<i class="bi bi-calendar-x me-1"></i>
								Cancel

							</button>
						`;


					} else if (
						!expired &&
						paidOnline &&
						status === "CONFIRMED"
					) {

						actionHtml = `
							<span
								class="small text-muted"
								title="Paid online consultation requires refund handling before cancellation">

								<i class="bi bi-shield-lock-fill me-1"></i>
								Contact clinic to cancel

							</span>
						`;


					} else if (expired) {

						actionHtml = `
							<button
								type="button"
								class="btn btn-sm btn-outline-danger patient-delete-appointment-btn"
								onclick="deleteExpiredPatientAppointment(${appointmentId})">

								<i class="bi bi-trash3-fill me-1"></i>
								Remove

							</button>
						`;
					}


					return `
						<tr>

							<td>

								<strong>
									${formatDate(
										appointment.appointmentDate
									)}
								</strong>

							</td>


							<td>

								<strong class="patient-doctor-name">
									Dr. ${safe(
										appointment.doctorName
									)}
								</strong>

								<div class="patient-doctor-meta">
									${safe(
										appointment.department
									)}
								</div>

							</td>


							<td>

								<span class="patient-appointment-time">

									<i class="bi bi-clock-fill"></i>

									${formatTime(
										appointment.appointmentTime
									)}

								</span>

							</td>


							<td>

								${appointmentType === "ONLINE"
									? `
										<span class="badge bg-success">

											<i class="bi bi-camera-video-fill"></i>
											ONLINE

										</span>
									`
									: `
										<span class="badge bg-secondary">

											<i class="bi bi-hospital-fill"></i>
											${escapeHtml(
												appointmentType || "OFFLINE"
											)}

										</span>
									`
								}

							</td>


							<td>

								${paymentBadge(
									appointment.paymentStatus
								)}

							</td>


							<td>

								${statusBadge(
									appointment.status
								)}

							</td>


							<td>

								${meetingHtml}

							</td>


							<td>

								<div class="patient-appointment-actions">
									${actionHtml}
								</div>

							</td>

						</tr>
					`;
				}
			)
			.join("");
}


/*
 * ============================================================
 * PATIENT CANCEL
 * ============================================================
 */

async function cancelPatientAppointment(
	appointmentId
) {

	if (!appointmentId) {
		return;
	}


	const confirmed =
		window.confirm(
			"Cancel this appointment?\n\n"
			+
			"This will release the doctor's slot."
		);


	if (!confirmed) {
		return;
	}


	const token =
		localStorage.getItem(
			"token"
		);


	const tenantId =
		localStorage.getItem(
			"tenantId"
		);


	if (
		!token ||
		!tenantId
	) {

		showMsg(
			"Login or SaaS workspace is missing."
		);

		return;
	}


	try {

		const response =
			await fetch(

				`${API_BASE}/saas/appointments/patient/${encodeURIComponent(
					appointmentId
				)}/cancel?tenantId=${encodeURIComponent(
					tenantId
				)}`,

				{
					method:
						"PUT",

					headers: {

						"Authorization":
							"Bearer " + token,

						"Accept":
							"application/json"
					}
				}
			);


		const result =
			await safeJson(
				response
			);


		if (!response.ok) {

			showMsg(
				getApiErrorMessage(
					result,
					"Unable to cancel appointment."
				)
			);

			return;
		}


		showMsg(
			getApiErrorMessage(
				result,
				"Appointment cancelled successfully."
			),
			"success"
		);


		await loadMyPatientAppointments();


	} catch (error) {

		console.error(
			"Patient appointment cancellation failed:",
			error
		);


		showMsg(
			"Unable to cancel appointment."
		);
	}
}