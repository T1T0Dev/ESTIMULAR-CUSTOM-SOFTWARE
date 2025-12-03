import React, { useState, useEffect } from "react";
import moment from "moment";
import Swal from "sweetalert2";
import API_BASE_URL from "../constants/api";
import useAuthStore from "../store/useAuthStore";
import "./../styles/TurnoModal.css";

const parseProfesionalIds = (value) =>
  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

export default function TurnoModal({
  event,
  onClose,
  onUpdate,
  onDelete,
  onOpenPagos,
  onOpenPaciente,
  loggedInProfesionalId,
  currentUserId = null,
  isAdmin = false,
  isRecepcion = false,
}) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTexto, setCancelTexto] = useState("");

  const { token } = useAuthStore();

  useEffect(() => {
    if (event) {
      setStartTime(moment(event.start).format("HH:mm"));
      setEndTime(moment(event.end).format("HH:mm"));
    }
  }, [event]);

  if (!event) return null;

  const { data: turno } = event;
  const profesionalIds = parseProfesionalIds(turno.profesional_ids);
  const identityCandidates = [loggedInProfesionalId, currentUserId]
    .filter((value) => value !== null && value !== undefined)
    .map((value) => String(value));
  const isMyEvent = identityCandidates.some((id) => profesionalIds.includes(id));
  const canManageTurno = isAdmin || isMyEvent || isRecepcion;
  const canDeleteTurno = isAdmin && typeof onDelete === "function";

  const handleTimeSave = () => {
    const [startHour, startMinute] = startTime.split(":").map(Number);
    const [endHour, endMinute] = endTime.split(":").map(Number);

    const startMoment = moment(event.start)
      .clone()
      .set({
        hour: startHour || 0,
        minute: startMinute || 0,
        second: 0,
        millisecond: 0,
      });

    const endMoment = moment(event.start)
      .clone()
      .set({
        hour: endHour || 0,
        minute: endMinute || 0,
        second: 0,
        millisecond: 0,
      });

    if (endMoment.isSameOrBefore(startMoment)) {
      endMoment.add(30, "minutes");
    }

    onUpdate(event, {
      inicio: startMoment.toISOString(),
      fin: endMoment.toISOString(),
    });
  };

  const handleChangeDay = () => {
    Swal.fire({
      icon: "info",
      title: "Funcionalidad no disponible",
      text: "La funcionalidad para cambiar el día aún no está implementada.",
      confirmButtonText: "Entendido",
    });
  };

  const createStatusHandler =
    (status, openPaymentModal = false) =>
    async () => {
      if (status === "cancelado") {
        setShowCancelModal(true);
        return;
      }

      const { isConfirmed } = await Swal.fire({
        title: "Confirmar cambio de estado",
        text: `¿Está seguro de que desea cambiar el estado a ${status.toUpperCase()}?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, cambiar",
        cancelButtonText: "Cancelar",
      });

      if (isConfirmed) {
        onUpdate(event, { estado: status }, openPaymentModal);
      }
    };

  const handleCancelSubmit = async () => {
    if (!cancelTexto.trim()) {
      await Swal.fire({
        title: "Advertencia",
        text: "Por favor, ingrese el motivo de la cancelación.",
        icon: "warning",
        confirmButtonText: "Entendido",
      });
      return;
    }

    const turnoId = event?.id ?? event?.data?.id;
    if (!turnoId) {
      await Swal.fire({
        title: "Error",
        text: "No se pudo identificar el turno a cancelar.",
        icon: "error",
      });
      return;
    }

    const subject = `Cancelación de turno ${moment(event.start).format("DD/MM/YYYY")}`;

    try {
      const headers = {
        "Content-Type": "application/json",
      };
      
      // Agregar header de usuario si está disponible
      if (currentUserId !== null && currentUserId !== undefined) {
        headers['X-User-ID'] = currentUserId;
      }
      
      // Agregar header de autorización si hay token
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/turnos/cancelar/${turnoId}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify({ subject, body: cancelTexto }),
        }
      );

      const result = await response.json();
      if (result?.success) {
        await Swal.fire({
          title: "Éxito",
          text: "Turno cancelado exitosamente. Se envió un email al responsable.",
          icon: "success",
          confirmButtonText: "Perfecto",
        });
        onUpdate(event, { estado: "cancelado" });
        setShowCancelModal(false);
        setCancelTexto("");
      } else {
        await Swal.fire({
          title: "Error",
          text: result?.message || "Error al cancelar el turno.",
          icon: "error",
        });
      }
    } catch (error) {
      console.error("Error en cancelación de turno:", error);
      await Swal.fire({
        title: "Error",
        text: "No se pudo cancelar el turno. Inténtelo nuevamente.",
        icon: "error",
      });
    }
  };

  const handleCancelCancel = () => {
    setShowCancelModal(false);
    setCancelTexto("");
  };
  const handleDeleteTurno = async () => {
    if (!canDeleteTurno) return;

    const { isConfirmed } = await Swal.fire({
      title: "Eliminar turno",
      text: "¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (isConfirmed) {
      onDelete(event);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          &times;
        </button>

        <div className="modal-header">
          <img
            src={`/pacientes/${turno.paciente_dni}.jpg`}
            alt={`Foto de ${turno.paciente_nombre}`}
            className="modal-patient-img"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "/src/assets/persona_prueba1.png";
            }}
          />
          <div className="modal-patient-info">
            <h2>
              {turno.paciente_nombre} {turno.paciente_apellido}
            </h2>
            <p>
              Nacimiento:{" "}
              {moment(turno.paciente_fecha_nacimiento).format("DD/MM/YYYY")}
            </p>
            <p>Servicio: {turno.servicio_nombre}</p>
            <button
              className="btn-view-patient"
              onClick={() => onOpenPaciente(turno)}
            >
              Ver Ficha
            </button>
          </div>
        </div>

        <div className="modal-body">
          {canManageTurno ? (
            <>
              <h3>Cambiar Estado</h3>
              <div className="modal-actions-grid">
                <button
                  className="btn-confirm"
                  onClick={createStatusHandler("completado", true)}
                  disabled={turno.estado === "completado" || turno.estado === "confirmado"}
                >
                  Confirmar Asistencia
                </button>
                <button
                  className="btn-no-show"
                  onClick={createStatusHandler("no_presento")}
                  disabled={turno.estado === "no_presento"}
                >
                  No se Presentó
                </button>
                <button
                  className="btn-pending"
                  onClick={createStatusHandler("pendiente")}
                  disabled={turno.estado === "pendiente"}
                >
                  Pendiente
                </button>
                <button
                  className="btn-cancel"
                  onClick={createStatusHandler("cancelado")}
                  disabled={turno.estado === "cancelado"}
                >
                  Cancelar
                </button>
                <button
                  className="btn-view-payments"
                  onClick={() => onOpenPagos(event)}
                >
                  Ver Pagos
                </button>
              </div>

              {isAdmin && (
                <>
                  <h3>Reagendar</h3>
                  <div className="modal-form-inline">
                    <div className="time-inputs">
                      <input
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                      <span>-</span>
                      <input
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                    <button className="btn-save" onClick={handleTimeSave}>
                      Guardar Hora
                    </button>
                  </div>
                  <button className="btn-change-day" onClick={handleChangeDay}>
                    Cambiar Día
                  </button>
                </>
              )}
            </>
          ) : (
            <p>No tiene permisos para modificar este turno.</p>
          )}
          {canDeleteTurno && (
            <div className="modal-admin-actions">
              <h3>Administrar</h3>
              <button className="btn-cancel" onClick={handleDeleteTurno}>
                Eliminar turno
              </button>
            </div>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="modal-backdrop" onClick={handleCancelCancel}>
          <div className="modal-content cancel-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Cancelación de turno</h3>
            <label htmlFor="motivo">Motivo de la cancelación del turno</label>
            <textarea
              id="motivo"
              value={cancelTexto}
              onChange={(e) => setCancelTexto(e.target.value)}
              placeholder="Redacte el motivo aquí..."
              rows="4"
            />
            <div className="modal-buttons">
              <button className="btn-cancel2" onClick={handleCancelCancel}>
                Cancelar
              </button>
              <button className="btn-send" onClick={handleCancelSubmit}>
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
