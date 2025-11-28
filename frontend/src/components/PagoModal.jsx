import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import API_BASE_URL from '../constants/api';
import {
  PAYMENT_METHODS,
  UNASSIGNED_PAYMENT_METHOD,
  getPaymentMethodLabel,
} from '../constants/paymentMethods';
import './../styles/PagoModal.css';

const clampDiscount = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
};

const formatCurrency = (amount, currency = 'ARS') => {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '';
  try {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch (error) {
    if (error) {
      // Ignorar y continuar con fallback
    }
    const value = Number(amount);
    if (Number.isNaN(value)) return '';
    return `${currency} ${value.toFixed(2)}`;
  }
};

const parseNotas = (notas) => {
  if (!notas || typeof notas !== 'string') return null;
  try {
    const parsed = JSON.parse(notas);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  } catch (error) {
    if (error) {
      // Ignorar contenido no JSON
    }
  }
  return null;
};

export default function PagoModal({ turno, onClose }) {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMetodos, setSelectedMetodos] = useState({});
  const [deudaStatus, setDeudaStatus] = useState(null);
  const [loadingDeuda, setLoadingDeuda] = useState(true);

  const fetchPagos = useCallback(async () => {
    if (!turno) return;
    setLoading(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/pagos?turno_id=${turno.id}`
      );
      const data = Array.isArray(res.data?.data) ? res.data.data : [];
      setPagos(data);
      setSelectedMetodos(() => {
        const initial = {};
        data.forEach((pago) => {
          const metodo =
            typeof pago.metodo === "string" ? pago.metodo.trim() : "";
          initial[pago.id] =
            metodo && metodo !== UNASSIGNED_PAYMENT_METHOD ? metodo : "";
        });
        return initial;
      });
    } catch (error) {
      console.error("Error fetching pagos:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        alert(
          `Error al cargar pagos: ${
            error.response.data?.message || "Error del servidor"
          }`
        );
      } else if (error.request) {
        console.error("No response received - backend might not be running");
        alert(
          "No se pudieron cargar los pagos. El servidor backend no está disponible."
        );
      } else {
        console.error("Request setup error:", error.message);
        alert("Error al configurar la solicitud de pagos.");
      }
    } finally {
      setLoading(false);
    }
  }, [turno]);

  const fetchDeudaStatus = useCallback(async () => {
    if (!turno?.paciente_dni) {
      setDeudaStatus(null);
      setLoadingDeuda(false);
      return;
    }
    setLoadingDeuda(true);
    try {
      const res = await axios.get(
        `${API_BASE_URL}/api/pagos/paciente-deuda?paciente_dni=${turno.paciente_dni}`
      );
      if (res.data?.success) {
        setDeudaStatus(res.data.data);
      } else {
        console.warn("API response not successful:", res.data);
        setDeudaStatus(null);
      }
    } catch (error) {
      console.error("Error fetching deuda status:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      } else if (error.request) {
        console.error("No response received - backend might not be running");
        setDeudaStatus({ error: "Backend no disponible" });
      } else {
        console.error("Request setup error:", error.message);
      }
    } finally {
      setLoadingDeuda(false);
    }
  }, [turno?.paciente_dni]);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  useEffect(() => {
    fetchDeudaStatus();
  }, [fetchDeudaStatus]);

  const handleMetodoChange = useCallback((pagoId, metodo) => {
    setSelectedMetodos((prev) => ({ ...prev, [pagoId]: metodo }));
  }, []);

  const handlePay = async (pagoId) => {
    const metodoSeleccionado = selectedMetodos[pagoId] || '';
    if (!metodoSeleccionado || metodoSeleccionado === UNASSIGNED_PAYMENT_METHOD) {
      alert('Seleccione un método de pago antes de completar.');
      return;
    }

    try {
      await axios.put(`${API_BASE_URL}/api/pagos/${pagoId}`, {
        estado: 'completado',
        turno_id: turno.id,
        metodo: metodoSeleccionado,
      });
      await fetchPagos();
    } catch (error) {
      console.error("Error updating pago:", error);
      alert('Error al procesar el pago.');
    }
  };

  if (!turno) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="pago-modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>&times;</button>
        <div className="pago-modal-header">
          <h2>Gestión de Pagos del Turno</h2>
          <div className="pago-modal-subheader">
            <p>
              Paciente: <strong>{turno.paciente_nombre} {turno.paciente_apellido}</strong>
            </p>
            {turno.paciente_obra_social && (
              <p className="obra-social-label">
                Obra social: <strong>{turno.paciente_obra_social}</strong>
              </p>
            )}
            {!loadingDeuda && deudaStatus && !deudaStatus.error && (
              <div className={`deuda-status ${deudaStatus.tiene_deuda ? 'debe' : 'al-dia'}`}>
                <p>
                  <strong>Estado de cuenta:</strong> 
                  {deudaStatus.tiene_deuda ? (
                    <span className="deuda-alert">
                      Debe ${formatCurrency(deudaStatus.total_deuda)} 
                      ({deudaStatus.cantidad_pagos_pendientes} pago{deudaStatus.cantidad_pagos_pendientes !== 1 ? 's' : ''} pendiente{deudaStatus.cantidad_pagos_pendientes !== 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="al-dia">Al día</span>
                  )}
                </p>
              </div>
            )}
            {!loadingDeuda && deudaStatus?.error && (
              <div className="deuda-status error">
                <p><em>No se pudo verificar el estado de cuenta</em></p>
              </div>
            )}
          </div>
        </div>
        <div className="pago-modal-body">
          {loading ? <p>Cargando...</p> : (
            <ul className="pago-list">
              {pagos.length > 0 ? (
                pagos.map((pago) => {
                  const notasData = parseNotas(pago.notas);
                  const metaOriginal =
                    notasData && typeof notasData.monto_original === 'number'
                      ? notasData.monto_original
                      : null;
                  const metaDescuento =
                    notasData && typeof notasData.descuento_aplicado === 'number'
                      ? notasData.descuento_aplicado
                      : null;

                  const descuento = clampDiscount(
                    metaDescuento !== null ? metaDescuento : turno?.paciente_obra_social_descuento
                  );

                  let montoOriginal = metaOriginal ?? pago.monto;
                  let montoFinal = metaOriginal !== null ? pago.monto : montoOriginal;

                  if (metaOriginal === null && descuento > 0) {
                    montoFinal = Number((montoOriginal * (1 - descuento)).toFixed(2));
                  }

                  if (!Number.isFinite(montoOriginal) || Number.isNaN(montoOriginal)) {
                    montoOriginal = 0;
                  }
                  if (!Number.isFinite(montoFinal) || Number.isNaN(montoFinal)) {
                    montoFinal = 0;
                  }
                  if (montoOriginal < 0) montoOriginal = 0;
                  if (montoFinal < 0) montoFinal = 0;

                  const diferencia = montoOriginal - montoFinal;
                  const ahorro = diferencia > 0.009 ? Number(diferencia.toFixed(2)) : null;
                  const mostrarDescuento = ahorro !== null && ahorro > 0;

                  const formattedOriginal = formatCurrency(montoOriginal);
                  const formattedFinal = formatCurrency(montoFinal);
                  return (
                    <li
                      key={pago.id}
                      className={`pago-item ${pago.estado === 'completado' ? 'pagado' : ''}`}
                    >
                      <div className="pago-details">
                        <div className="pago-amount">
                          {mostrarDescuento ? (
                            <>
                              <span className="price-original">{formattedOriginal}</span>
                              <span className="price-arrow" aria-hidden="true">→</span>
                              <span className="price-discounted">{formattedFinal}</span>
                            </>
                          ) : (
                            <span className="price-single">{formattedOriginal}</span>
                          )}
                        </div>
                        <div className="pago-meta">
                          {pago.estado === 'completado' ? (
                            <span className="pago-metodo">
                              Método: {getPaymentMethodLabel(pago.metodo)}
                            </span>
                          ) : (
                            <label className="pago-metodo-select" htmlFor={`metodo-${pago.id}`}>
                              Método:
                              <select
                                id={`metodo-${pago.id}`}
                                value={selectedMetodos[pago.id] || ''}
                                onChange={(event) => handleMetodoChange(pago.id, event.target.value)}
                              >
                                <option value="" disabled>
                                  Seleccionar…
                                </option>
                                {PAYMENT_METHODS.map((metodoOption) => (
                                  <option key={metodoOption.value} value={metodoOption.value}>
                                    {metodoOption.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                        </div>
                      </div>
                      {pago.estado !== 'completado' && (
                        <button className="btn-pay" onClick={() => handlePay(pago.id)}>
                          Marcar Pagado
                        </button>
                      )}
                    </li>
                  );
                })
              ) : (
                <p className="no-pagos">No hay pagos registrados para este turno.</p>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
