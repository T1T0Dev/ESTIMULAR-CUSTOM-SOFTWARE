import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import SelectPaymentMethodModal from "../components/SelectPaymentMethodModal";
import {
  PAYMENT_METHODS,
  UNASSIGNED_PAYMENT_METHOD,
  getPaymentMethodLabel,
} from "../constants/paymentMethods";
import "../styles/PagosDashboard.css";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const detailedCurrencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-AR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const DEFAULT_TOTALS = {
  total_pendiente: 0,
  cantidad_turnos: 0,
  cantidad_ninos: 0,
};

const DEFAULT_RESUMEN = {
  deberes: 0,
  haberes: 0,
  cobrosMesesAnteriores: 0,
};

const EMPTY_MODAL_STATE = {
  open: false,
  defaultValue: "",
  actionKey: null,
  rowKey: null,
  pagos: [],
  title: "",
  description: "",
  collapseRow: false,
};

function formatCurrency(amount, currency = "ARS", detailed = true) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  try {
    return (detailed ? detailedCurrencyFormatter : currencyFormatter).format(
      value
    );
  } catch {
    const digits = detailed ? 2 : 0;
    return `${currency} ${value.toFixed(digits)}`;
  }
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateFormatter.format(date);
}
function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return dateTimeFormatter.format(date);
}

function getRowKey(row, index) {
  if (row?.nino?.id_nino) {
    return `nino-${row.nino.id_nino}`;
  }
  return `fila-${index}`;
}

export default function PagosDashboard() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  const etiquetaMesActual = useMemo(
    () => `${MESES[currentMonth]} ${currentYear}`,
    [currentMonth, currentYear]
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deudas, setDeudas] = useState([]);
  const [totals, setTotals] = useState(DEFAULT_TOTALS);
  const [resumen, setResumen] = useState(DEFAULT_RESUMEN);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [processingKeys, setProcessingKeys] = useState(() => new Set());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [paymentModalState, setPaymentModalState] = useState(EMPTY_MODAL_STATE);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const toggleProcessingKey = useCallback((key, isActive) => {
    setProcessingKeys((prev) => {
      const next = new Set(prev);
      if (isActive) {
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, []);

  const fetchData = useCallback(
    async (withSpinner = true) => {
      if (withSpinner) {
        setLoading(true);
      }
      setError(null);

      try {
        const [deudasResult, resumenResult] = await Promise.allSettled([
          axios.get(`${API_BASE_URL}/api/pagos/dashboard/deudas`),
          axios.get(`${API_BASE_URL}/api/finanzas/resumen-mensual`, {
            params: { anio: currentYear },
          }),
        ]);

        if (deudasResult.status === "fulfilled") {
          const payload = deudasResult.value?.data || {};
          const items = Array.isArray(payload.data) ? payload.data : [];
          const totalsPayload = payload.totals || DEFAULT_TOTALS;

          setDeudas(items);
          setTotals({
            total_pendiente: Number(totalsPayload.total_pendiente || 0),
            cantidad_turnos: Number(totalsPayload.cantidad_turnos || 0),
            cantidad_ninos: Number(totalsPayload.cantidad_ninos || 0),
          });
          setLastUpdated(new Date().toISOString());
        } else {
          console.error(
            "Error cargando deudas de pagos",
            deudasResult.reason
          );
          setError("No se pudo cargar la información de pagos pendientes.");
        }

        if (resumenResult.status === "fulfilled") {
          const summaryItems = Array.isArray(resumenResult.value?.data?.data)
            ? resumenResult.value.data.data
            : [];
          const currentSummary =
            summaryItems.find((item) => item?.mes === etiquetaMesActual) ||
            null;

          setResumen(
            currentSummary
              ? {
                  deberes: Number(currentSummary.deberes || 0),
                  haberes: Number(currentSummary.haberes || 0),
                  cobrosMesesAnteriores: Number(
                    currentSummary.cobrosMesesAnteriores || 0
                  ),
                }
              : DEFAULT_RESUMEN
          );
        } else {
          console.warn(
            "No se pudo cargar el resumen mensual",
            resumenResult.reason
          );
          setResumen(DEFAULT_RESUMEN);
        }
      } catch (err) {
        console.error("Error general cargando el panel de pagos", err);
        setError("No se pudo cargar el panel de pagos.");
      } finally {
        if (withSpinner) {
          setLoading(false);
        }
      }
    },
    [currentYear, etiquetaMesActual]
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const toggleRow = useCallback((key) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const processingSet = processingKeys;

  const resumenCards = useMemo(
    () => [
      {
        id: "deberes",
        className: "debe",
        label: "Deberes (turnos pendientes)",
        valor: formatCurrency(totals.total_pendiente, "ARS", false),
        detalle:
          totals.cantidad_turnos > 0
            ? `${totals.cantidad_turnos} turnos con saldo pendiente`
            : "Sin turnos impagos registrados",
      },
      {
        id: "bruta",
        className: "haber",
        label: "Ganancia bruta",
        valor: formatCurrency(resumen.haberes, "ARS", false),
        detalle: "Pagos completados del mes en curso",
      },
      {
        id: "anteriores",
        className: "neta",
        label: "Cobros de meses anteriores",
        valor: formatCurrency(resumen.cobrosMesesAnteriores, "ARS", false),
        detalle: "Montos cobrados este mes por turnos previos",
      },
    ],
    [
      resumen.cobrosMesesAnteriores,
      resumen.haberes,
      totals.cantidad_turnos,
      totals.total_pendiente,
    ]
  );

  const handlePayTurno = useCallback((rowKey, turno) => {
    if (!turno || !Array.isArray(turno.pagos) || turno.pagos.length === 0) {
      return;
    }

    const pendientes = turno.pagos.filter(
      (pago) => pago && pago.estado !== "completado"
    );

    if (pendientes.length === 0) {
      return;
    }

    const pagosPayload = pendientes
      .map((pago) => ({
        pagoId: pago?.id,
        turnoId: pago?.turno_id || turno.turno_id,
      }))
      .filter((item) => item.pagoId && item.turnoId);

    if (pagosPayload.length === 0) {
      return;
    }

    const defaultMethod = pendientes.find(
      (pago) =>
        typeof pago?.metodo === "string" &&
        pago.metodo.trim() !== "" &&
        pago.metodo !== UNASSIGNED_PAYMENT_METHOD
    )?.metodo;

    const actionKey = `turno-${rowKey}-${turno.turno_id || "sin-id"}`;
    const description = turno?.servicio_nombre
      ? `Seleccioná el método de pago para registrar el cobro del turno de ${turno.servicio_nombre}.`
      : "Seleccioná el método de pago para registrar este turno.";

    setModalSubmitting(false);
    setPaymentModalState({
      open: true,
      defaultValue: defaultMethod || "",
      actionKey,
      rowKey,
      pagos: pagosPayload,
      title: "Registrar cobro del turno",
      description,
      collapseRow: true,
    });
  }, [setModalSubmitting, setPaymentModalState]);

  const handlePayAll = useCallback(
    (rowKey, row) => {
      if (!row || !Array.isArray(row.turnos) || row.turnos.length === 0) {
        return;
      }

      const pagos = row.turnos.flatMap((turno) => turno.pagos || []);
      const pendientes = pagos.filter(
        (pago) => pago && pago.estado !== "completado"
      );

      if (pendientes.length === 0) {
        return;
      }

      const pagosPayload = pendientes
        .map((pago) => ({
          pagoId: pago?.id,
          turnoId: pago?.turno_id || null,
        }))
        .filter((item) => item.pagoId && item.turnoId);

      if (pagosPayload.length === 0) {
        return;
      }

      const defaultMethod = pendientes.find(
        (pago) =>
          typeof pago?.metodo === "string" &&
          pago.metodo.trim() !== "" &&
          pago.metodo !== UNASSIGNED_PAYMENT_METHOD
      )?.metodo;

      const actionKey = `todo-${rowKey}`;
      const familyName = row?.nino
        ? `${row.nino.nombre || ""} ${row.nino.apellido || ""}`.trim()
        : "la familia";
      const description = familyName
        ? `Seleccioná el método de pago para registrar todos los cobros pendientes de ${familyName}.`
        : "Seleccioná el método de pago para registrar todos los cobros pendientes.";

      setModalSubmitting(false);
      setPaymentModalState({
        open: true,
        defaultValue: defaultMethod || "",
        actionKey,
        rowKey,
        pagos: pagosPayload,
        title: "Registrar todos los cobros pendientes",
        description,
        collapseRow: true,
      });
    },
    [setModalSubmitting, setPaymentModalState]
  );

  const handleConfirmPaymentMethod = useCallback(
    async (selectedMethod) => {
      if (!selectedMethod) {
        return;
      }

      if (!paymentModalState.open) {
        return;
      }

      const { actionKey, pagos, rowKey, collapseRow } = paymentModalState;

      if (!Array.isArray(pagos) || pagos.length === 0) {
        setPaymentModalState(EMPTY_MODAL_STATE);
        return;
      }

      setModalSubmitting(true);
      if (actionKey) {
        toggleProcessingKey(actionKey, true);
      }

      try {
        for (const pagoConfig of pagos) {
          const pagoId = pagoConfig?.pagoId;
          const turnoId = pagoConfig?.turnoId;
          if (!pagoId || !turnoId) {
            continue;
          }
          await axios.put(`${API_BASE_URL}/api/pagos/${pagoId}`, {
            estado: "completado",
            turno_id: turnoId,
            metodo: selectedMethod,
          });
        }

        if (collapseRow && rowKey) {
          setExpandedRows((prev) => {
            const next = new Set(prev);
            next.delete(rowKey);
            return next;
          });
        }

        await fetchData(false);
        setPaymentModalState(EMPTY_MODAL_STATE);
      } catch (err) {
        console.error("Error al registrar los pagos seleccionados", err);
        window.alert("No se pudieron registrar los pagos seleccionados.");
      } finally {
        setModalSubmitting(false);
        if (actionKey) {
          toggleProcessingKey(actionKey, false);
        }
      }
    },
    [fetchData, paymentModalState, toggleProcessingKey]
  );

  const handleCancelPaymentMethod = useCallback(() => {
    if (modalSubmitting) {
      return;
    }
    setPaymentModalState(EMPTY_MODAL_STATE);
  }, [modalSubmitting]);

  return (
    <>
      <section className="pagos-dashboard-page">
        <header className="pagos-dashboard-header">
          <div>
            <h1>Panel de pagos</h1>
            <p>Gestioná las deudas pendientes y visualizá los cobros recientes.</p>
          </div>
          <div className="pagos-dashboard-actions">
            {lastUpdated && (
              <span className="pagos-dashboard-updated">
                Actualizado: {formatDateTime(lastUpdated)}
              </span>
            )}
            <button
              type="button"
              className="pagos-btn refresh"
              onClick={() => fetchData(true)}
              disabled={loading}
            >
              {loading ? "Actualizando..." : "Actualizar"}
            </button>
          </div>
        </header>

        <div className="panel-financiero-resumen pagos-resumen-cards">
          {resumenCards.map((card) => (
            <div
              key={card.id}
              className={`panel-card resumen-card ${card.className}`}
            >
              <div className="label">{card.label}</div>
              <div className="valor">{card.valor}</div>
              <p className="detalle">{card.detalle}</p>
            </div>
          ))}
        </div>

        <div className="pagos-card">
          <div className="pagos-card-header">
            <div>
              <h2>Familias con deuda activa</h2>
              <p>
                {totals.cantidad_ninos > 0
                  ? `${totals.cantidad_ninos} familias con pagos pendientes.`
                  : "No hay pagos pendientes registrados."}
              </p>
            </div>
          </div>

          {error && <div className="pagos-alert">{error}</div>}

          <div className="pagos-table-wrapper">
            <table className="pagos-table" aria-label="Listado de deudas por familia">
            <thead>
              <tr>
                <th>Niño</th>
                <th>Responsable</th>
                <th>Última cuota impaga</th>
                <th className="align-right">Monto en deuda</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="loading-cell">
                    Cargando deudas...
                  </td>
                </tr>
              ) : deudas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="loading-cell">
                    ¡Al día! No hay cuotas impagas registradas.
                  </td>
                </tr>
              ) : (
                deudas.map((row, index) => {
                  const rowKey = getRowKey(row, index);
                  const isExpanded = expandedRows.has(rowKey);
                  const responsableNombre = row.responsable
                    ? `${row.responsable.nombre || ""} ${
                        row.responsable.apellido || ""
                      }`.trim()
                    : "Sin responsable asignado";
                  const moneda = row.moneda || "ARS";
                  const payAllKey = `todo-${rowKey}`;
                  const payAllProcessing = processingSet.has(payAllKey);

                  return (
                    <React.Fragment key={rowKey}>
                      <tr
                        className={`pagos-row${isExpanded ? " is-expanded" : ""}`}
                        onClick={() => toggleRow(rowKey)}
                      >
                        <td>
                          <div className="pagos-nino">
                            <span>
                              {`${row.nino?.nombre || "—"} ${
                                row.nino?.apellido || ""
                              }`.trim()}
                            </span>
                            {row.nino?.obra_social && (
                              <small>
                                Obra social: {row.nino.obra_social}
                              </small>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="pagos-responsable">
                            <span>{responsableNombre || "—"}</span>
                            {row.responsable?.parentesco && (
                              <small>{row.responsable.parentesco}</small>
                            )}
                          </div>
                        </td>
                        <td>{formatDate(row.fecha_ultima_cuota_impaga)}</td>
                        <td className="align-right">
                          {formatCurrency(row.monto_total_pendiente, moneda)}
                        </td>
                      </tr>
                      <tr className="pagos-detail-row">
                        <td colSpan={4}>
                          {isExpanded && (
                            <div
                              className="pagos-detail"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <div className="pagos-detail-header">
                                <div>
                                  <span className="pagos-detail-label">
                                    Total adeudado
                                  </span>
                                  <strong>
                                    {formatCurrency(
                                      row.monto_total_pendiente,
                                      moneda
                                    )}
                                  </strong>
                                </div>
                                <button
                                  type="button"
                                  className="pagos-btn primary"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    handlePayAll(rowKey, row);
                                  }}
                                  disabled={payAllProcessing}
                                >
                                  {payAllProcessing
                                    ? "Procesando..."
                                    : `Pagar todo · ${formatCurrency(
                                        row.monto_total_pendiente,
                                        moneda
                                      )}`}
                                </button>
                              </div>

                              <div className="pagos-turnos">
                                {row.turnos.map((turno, turnoIndex) => {
                                  const turnoKey = `turno-${rowKey}-${
                                    turno.turno_id || turnoIndex
                                  }`;
                                  const turnoProcessing =
                                    processingSet.has(turnoKey);
                                  const turnoMoneda = turno.moneda || moneda;

                                  return (
                                    <article
                                      key={turnoKey}
                                      className="pagos-turno"
                                    >
                                      <div className="pagos-turno-header">
                                        <div>
                                          <h3>
                                            {turno.servicio_nombre ||
                                              "Turno sin área"}
                                          </h3>
                                          <p>
                                            {formatDateTime(turno.inicio)}
                                            {turno.consultorio_nombre && (
                                              <span className="consultorio">
                                                {` · ${
                                                  turno.consultorio_nombre
                                                }`}
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                        <div className="pagos-turno-actions">
                                          <span className="monto">
                                            {formatCurrency(
                                              turno.total_pendiente,
                                              turnoMoneda
                                            )}
                                          </span>
                                          <button
                                            type="button"
                                            className="pagos-btn secondary"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              handlePayTurno(rowKey, turno);
                                            }}
                                            disabled={turnoProcessing}
                                          >
                                            {turnoProcessing
                                              ? "Procesando..."
                                              : "Pagar turno"}
                                          </button>
                                        </div>
                                      </div>

                                      <ul className="pagos-cuotas">
                                        {turno.pagos.map((pago) => (
                                          <li key={pago.id}>
                                            <div>
                                              <span className="cuota-label">
                                                Cuota #{pago.id}
                                              </span>
                                              <small>
                                                Registrada el {formatDate(
                                                  pago.registrado_en
                                                )}
                                              </small>
                                            </div>
                                            <div className="cuota-meta">
                                              <span>
                                                {formatCurrency(
                                                  pago.monto,
                                                  pago.moneda || turnoMoneda,
                                                  true
                                                )}
                                              </span>
                                              <small>
                                                Método: {getPaymentMethodLabel(pago.metodo)}
                                              </small>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            </table>
          </div>
        </div>
      </section>
      <SelectPaymentMethodModal
        open={paymentModalState.open}
        title={paymentModalState.title}
        description={paymentModalState.description}
        defaultValue={paymentModalState.defaultValue}
        submitting={modalSubmitting}
        onConfirm={handleConfirmPaymentMethod}
        onCancel={handleCancelPaymentMethod}
      />
    </>
  );
}
