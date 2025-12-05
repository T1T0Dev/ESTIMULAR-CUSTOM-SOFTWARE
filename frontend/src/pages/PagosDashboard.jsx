import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
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
  coberturaObraSocial: 0,
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
  amountSummary: null,
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

function toDateInputValue(date = new Date()) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    return "";
  }
  const tzOffset = date.getTimezoneOffset() * 60000;
  const localDate = new Date(date.getTime() - tzOffset);
  return localDate.toISOString().slice(0, 10);
}

function getRowKey(row, index) {
  if (row?.nino?.id_nino) {
    return `nino-${row.nino.id_nino}`;
  }
  return `fila-${index}`;
}

function clampPercent(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > 1) return 1;
  return parsed;
}

function parsePagoNotas(rawNotas) {
  if (!rawNotas || typeof rawNotas !== "string") return null;
  try {
    const parsed = JSON.parse(rawNotas);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function computePagoCoverage(pago, nino) {
  const originalAmount = Number(pago?.monto || 0);
  const estado = String(pago?.estado || "").toLowerCase();
  const notasData = parsePagoNotas(pago?.notas);

  if (notasData && typeof notasData === "object") {
    const notedOriginal = Number(
      notasData.monto_original ??
        notasData.montoOriginal ??
        notasData.precio_original ??
        notasData.precioOriginal ??
        NaN
    );
    const notedDescuento = Number(
      notasData.descuento_monto ??
        notasData.descuentoMonto ??
        notasData.descuento_aplicado_monto ??
        NaN
    );

    if (Number.isFinite(notedOriginal) && notedOriginal > 0) {
      const cobertura = Math.max(
        0,
        Number((notedOriginal - originalAmount).toFixed(2))
      );
      if (cobertura > 0) {
        return {
          cobertura,
          saldoPaciente: Math.max(originalAmount, 0),
          montoOriginal: notedOriginal,
        };
      }
    }

    if (Number.isFinite(notedDescuento) && notedDescuento > 0) {
      const cobertura = Math.min(notedDescuento, originalAmount);
      return {
        cobertura,
        saldoPaciente: Math.max(originalAmount - cobertura, 0),
        montoOriginal: Math.max(originalAmount, cobertura),
      };
    }
  }

  const rawDescriptor = Number(nino?.obra_social_descuento ?? NaN);
  if (!Number.isFinite(rawDescriptor) || rawDescriptor <= 0) {
    return {
      cobertura: 0,
      saldoPaciente: Math.max(originalAmount, 0),
      montoOriginal: Math.max(originalAmount, 0),
    };
  }

  if (rawDescriptor > 1) {
    const cobertura = Math.min(Number(rawDescriptor.toFixed(2)), originalAmount);
    if (estado === "completado") {
      return {
        cobertura,
        saldoPaciente: Math.max(originalAmount, 0),
        montoOriginal: Math.max(originalAmount + cobertura, 0),
      };
    }
    return {
      cobertura,
      saldoPaciente: Math.max(originalAmount - cobertura, 0),
      montoOriginal: Math.max(originalAmount, 0),
    };
  }

  const ratio = clampPercent(rawDescriptor);
  if (ratio <= 0) {
    return {
      cobertura: 0,
      saldoPaciente: Math.max(originalAmount, 0),
      montoOriginal: Math.max(originalAmount, 0),
    };
  }

  if (estado === "completado") {
    const montoOriginal = Number((originalAmount / (1 - ratio)).toFixed(2));
    const cobertura = Math.max(0, Number((montoOriginal - originalAmount).toFixed(2)));
    return {
      cobertura,
      saldoPaciente: Math.max(originalAmount, 0),
      montoOriginal,
    };
  }

  const cobertura = Number((originalAmount * ratio).toFixed(2));
  return {
    cobertura,
    saldoPaciente: Math.max(originalAmount - cobertura, 0),
    montoOriginal: Math.max(originalAmount, 0),
  };
}

function toCurrencyAmount(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Number(numeric.toFixed(2));
}

function buildAmountSummary({ original, paciente, cobertura, moneda, count }) {
  const numericCount = Number(count);
  return {
    totalOriginal: toCurrencyAmount(original),
    totalPaciente: toCurrencyAmount(paciente),
    totalCobertura: toCurrencyAmount(cobertura),
    moneda: moneda || "ARS",
    count: Number.isFinite(numericCount) && numericCount > 0 ? Math.round(numericCount) : null,
  };
}

function prepareDeudaRow(row) {
  if (!row || !Array.isArray(row.turnos)) {
    return {
      ...row,
      turnos: [],
      totalPaciente: 0,
      totalCobertura: 0,
      totalOriginal: 0,
    };
  }

  let totalPaciente = 0;
  let totalCobertura = 0;
  let totalOriginal = 0;

  const turnos = row.turnos.map((turno) => {
    if (!turno || !Array.isArray(turno.pagos)) {
      return {
        ...turno,
        pagos: [],
        totalPaciente: 0,
        totalCobertura: 0,
        totalOriginal: 0,
      };
    }

    let turnoPaciente = 0;
    let turnoCobertura = 0;
    let turnoOriginal = 0;

    const pagos = turno.pagos.map((pago) => {
      const coverageInfo = computePagoCoverage(pago, row.nino);
      const cobertura = Number.isFinite(coverageInfo.cobertura)
        ? coverageInfo.cobertura
        : 0;
      const pacientePaga = Number.isFinite(coverageInfo.saldoPaciente)
        ? coverageInfo.saldoPaciente
        : Number(pago?.monto || 0);
      const montoOriginal = Number.isFinite(coverageInfo.montoOriginal)
        ? coverageInfo.montoOriginal
        : Number(pago?.monto || 0);

      turnoPaciente += pacientePaga;
      turnoCobertura += cobertura;
      turnoOriginal += montoOriginal;

      return {
        ...pago,
        coverageInfo: {
          cobertura: Number(cobertura.toFixed(2)),
          pacientePaga: Number(pacientePaga.toFixed(2)),
          montoOriginal: Number(montoOriginal.toFixed(2)),
        },
      };
    });

    totalPaciente += turnoPaciente;
    totalCobertura += turnoCobertura;
    totalOriginal += turnoOriginal;

    return {
      ...turno,
      pagos,
      totalPaciente: Number(turnoPaciente.toFixed(2)),
      totalCobertura: Number(turnoCobertura.toFixed(2)),
      totalOriginal: Number(turnoOriginal.toFixed(2)),
    };
  });

  return {
    ...row,
    turnos,
    totalPaciente: Number(totalPaciente.toFixed(2)),
    totalCobertura: Number(totalCobertura.toFixed(2)),
    totalOriginal: Number(totalOriginal.toFixed(2)),
  };
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
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceModalLoading, setPriceModalLoading] = useState(false);
  const [priceModalError, setPriceModalError] = useState("");
  const [priceModalDepartamentos, setPriceModalDepartamentos] = useState([]);
  const [priceEffectiveDate, setPriceEffectiveDate] = useState(() => toDateInputValue());
  const [priceSaving, setPriceSaving] = useState(false);

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
                  coberturaObraSocial: Number(
                    currentSummary.coberturaObraSocial || 0
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

  const handleOpenPriceModal = useCallback(async () => {
    setPriceModalOpen(true);
    setPriceModalError("");
    setPriceModalLoading(true);
    setPriceSaving(false);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/profesiones`);
      const items = Array.isArray(response?.data?.data) ? response.data.data : [];
      const mapped = items.map((item) => ({
        id_departamento: item.id_departamento,
        nombre: item.nombre || "Sin nombre",
        precio_actual: Number(item.precio_default || 0),
        precio_nuevo:
          item.precio_default === null || item.precio_default === undefined
            ? ""
            : String(Number(item.precio_default)),
        precio_actualizado_en: item.precio_actualizado_en || null,
      }));
      setPriceModalDepartamentos(mapped);
      setPriceEffectiveDate((prev) => prev || toDateInputValue());
    } catch (error) {
      console.error("Error al cargar precios de profesiones", error);
      setPriceModalError("No se pudieron cargar los precios actuales.");
      setPriceModalDepartamentos([]);
    } finally {
      setPriceModalLoading(false);
    }
  }, []);

  const handleClosePriceModal = useCallback(() => {
    if (priceSaving) return;
    setPriceModalOpen(false);
    setPriceModalError("");
  }, [priceSaving]);

  const handleChangeDepartamentoPrecio = useCallback((departamentoId, value) => {
    const sanitized = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setPriceModalDepartamentos((prev) =>
      prev.map((dep) =>
        dep.id_departamento === departamentoId
          ? {
              ...dep,
              precio_nuevo: sanitized,
            }
          : dep
      )
    );
    setPriceModalError("");
  }, []);

  const handleApplyPriceChanges = useCallback(async () => {
    setPriceModalError("");

    if (!priceEffectiveDate) {
      setPriceModalError("Seleccioná la fecha desde la que se aplicará el nuevo precio.");
      return;
    }

    const updates = priceModalDepartamentos
      .map((dep) => {
        const parsed = Number(dep.precio_nuevo);
        if (!Number.isFinite(parsed) || Number.isNaN(parsed) || parsed <= 0) {
          return null;
        }
        return {
          departamento_id: dep.id_departamento,
          nuevo_precio: Number(parsed.toFixed(2)),
        };
      })
      .filter(Boolean);

    if (updates.length === 0) {
      setPriceModalError("Ingresá al menos un precio válido mayor a 0.");
      return;
    }

    setPriceSaving(true);
    try {
      const payload = {
        aplicar_desde: priceEffectiveDate,
        actualizaciones: updates,
      };
      await axios.post(`${API_BASE_URL}/api/profesiones/ajustar-precios`, payload);
      setPriceModalOpen(false);
      Swal.fire({
        icon: "success",
        title: "Precios actualizados",
        text: "Se aplicaron los nuevos precios a los turnos futuros.",
        confirmButtonColor: "#e91e63",
      });
      fetchData(true);
    } catch (error) {
      console.error("Error al ajustar precios", error);
      const message =
        error?.response?.data?.message || "No se pudieron actualizar los precios.";
      setPriceModalError(message);
    } finally {
      setPriceSaving(false);
    }
  }, [fetchData, priceEffectiveDate, priceModalDepartamentos]);

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

  const processedDeudas = useMemo(
    () => deudas.map((row) => prepareDeudaRow(row)),
    [deudas]
  );

  const deudaConCobertura = useMemo(() => {
    return processedDeudas.reduce(
      (acc, row) => {
        const paciente = Number.isFinite(row?.totalPaciente)
          ? row.totalPaciente
          : 0;
        const cobertura = Number.isFinite(row?.totalCobertura)
          ? row.totalCobertura
          : 0;
        acc.paciente += paciente;
        acc.cobertura += cobertura;
        return acc;
      },
      { paciente: 0, cobertura: 0 }
    );
  }, [processedDeudas]);

  const resumenCards = useMemo(() => {
    const coberturaDetalle =
      totals.cantidad_turnos > 0 && deudaConCobertura.cobertura > 0
        ? ` · Obra social cubre ${formatCurrency(
            deudaConCobertura.cobertura,
            "ARS",
            false
          )}`
        : "";

    return [
      {
        id: "deberes",
        className: "debe",
        label: "Deberes (turnos pendientes)",
        valor: formatCurrency(deudaConCobertura.paciente, "ARS", false),
        detalle:
          totals.cantidad_turnos > 0
            ? `${totals.cantidad_turnos} turnos con saldo pendiente${coberturaDetalle}`
            : "Sin turnos impagos registrados",
      },
      {
        id: "cobertura",
        className: "cobertura",
        label: "Cubierto por obra social",
        valor: formatCurrency(resumen.coberturaObraSocial, "ARS", false),
        detalle:
          resumen.coberturaObraSocial > 0
            ? "Descuentos aplicados por obras sociales este mes"
            : "Sin bonificaciones registradas en el mes",
      },
    ];
  }, [
    resumen.coberturaObraSocial,
    totals.cantidad_turnos,
    deudaConCobertura.cobertura,
    deudaConCobertura.paciente,
  ]);

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

    const sumFromPagos = (selector) =>
      pendientes.reduce((acc, pago) => {
        const value = Number(selector(pago));
        return Number.isFinite(value) ? acc + value : acc;
      }, 0);

    const turnoOriginal = Number(turno?.totalOriginal);
    const totalOriginal = Number.isFinite(turnoOriginal)
      ? turnoOriginal
      : sumFromPagos(
          (pago) =>
            pago?.coverageInfo?.montoOriginal ?? pago?.monto ?? 0
        );

    const turnoPaciente = Number(turno?.totalPaciente);
    const totalPaciente = Number.isFinite(turnoPaciente)
      ? turnoPaciente
      : sumFromPagos(
          (pago) =>
            pago?.coverageInfo?.pacientePaga ??
            pago?.coverageInfo?.saldoPaciente ??
            pago?.monto ??
            0
        );

    const turnoCobertura = Number(turno?.totalCobertura);
    const totalCobertura = Number.isFinite(turnoCobertura)
      ? turnoCobertura
      : sumFromPagos((pago) => pago?.coverageInfo?.cobertura ?? 0);

    const amountSummary = buildAmountSummary({
      original: totalOriginal,
      paciente: totalPaciente,
      cobertura: totalCobertura,
      moneda:
        turno?.moneda ||
        pendientes[0]?.moneda ||
        (Array.isArray(turno.pagos) && turno.pagos[0]?.moneda) ||
        "ARS",
      count: pendientes.length,
    });

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
      amountSummary,
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

      const sumTurnos = (selector) =>
        row.turnos.reduce((acc, turnoItem) => {
          const value = Number(selector(turnoItem));
          return Number.isFinite(value) ? acc + value : acc;
        }, 0);

      const rowOriginal = Number(row?.totalOriginal);
      const totalOriginal = Number.isFinite(rowOriginal)
        ? rowOriginal
        : sumTurnos((turnoItem) => turnoItem.totalOriginal ?? 0);

      const rowPaciente = Number(row?.totalPaciente);
      const totalPaciente = Number.isFinite(rowPaciente)
        ? rowPaciente
        : sumTurnos((turnoItem) => turnoItem.totalPaciente ?? 0);

      const rowCobertura = Number(row?.totalCobertura);
      const totalCobertura = Number.isFinite(rowCobertura)
        ? rowCobertura
        : sumTurnos((turnoItem) => turnoItem.totalCobertura ?? 0);

      const amountSummary = buildAmountSummary({
        original: totalOriginal,
        paciente: totalPaciente,
        cobertura: totalCobertura,
        moneda:
          row?.moneda ||
          (row.turnos[0]?.moneda || (pendientes[0]?.moneda ?? "ARS")),
        count: pendientes.length,
      });

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
        amountSummary,
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
        Swal.fire({
          icon: 'error',
          title: 'Error al registrar pagos',
          text: 'No se pudieron registrar los pagos seleccionados.'
        });
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
              className="pagos-btn primary"
              onClick={handleOpenPriceModal}
              disabled={loading}
            >
              Ajustar precios
            </button>
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
              ) : processedDeudas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="loading-cell">
                    ¡Al día! No hay cuotas impagas registradas.
                  </td>
                </tr>
              ) : (
                processedDeudas.map((row, index) => {
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
                          {formatCurrency(row.totalPaciente, moneda)}
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
                                      row.totalPaciente,
                                      moneda
                                    )}
                                  </strong>
                                  {row.totalCobertura > 0 && (
                                    <small className="pagos-detail-coverage">
                                      Obra social cubre {" "}
                                      {formatCurrency(
                                        row.totalCobertura,
                                        moneda
                                      )}
                                    </small>
                                  )}
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
                                        row.totalPaciente,
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
                                              turno.totalPaciente,
                                              turnoMoneda
                                            )}
                                          </span>
                                          {turno.totalCobertura > 0 && (
                                            <span className="monto-cobertura">
                                              Obra social cubre {" "}
                                              {formatCurrency(
                                                turno.totalCobertura,
                                                turnoMoneda
                                              )}
                                            </span>
                                          )}
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
                                        {turno.pagos.map((pago) => {
                                          const pagoKey = pago.id || pago.id_pago;
                                          const coverageInfo =
                                            pago.coverageInfo ||
                                            computePagoCoverage(pago, row.nino);
                                          const cobertura = Number(
                                            Number(
                                              coverageInfo?.cobertura || 0
                                            ).toFixed(2)
                                          );
                                          const montoPaciente = Number(
                                            Number(
                                              coverageInfo?.pacientePaga ??
                                                coverageInfo?.saldoPaciente ??
                                                pago.monto
                                            ).toFixed(2)
                                          );
                                          const montoOriginal = Number(
                                            Number(
                                              coverageInfo?.montoOriginal ??
                                                pago.monto
                                            ).toFixed(2)
                                          );
                                          const tieneCobertura = cobertura > 0.01;
                                          return (
                                            <li key={pagoKey}>
                                              <div aria-hidden="true" />
                                              <div className="cuota-meta">
                                                {tieneCobertura ? (
                                                  <div className="cuota-amount-group">
                                                    <span className="cuota-monto-original">
                                                      Precio original: {formatCurrency(
                                                        montoOriginal,
                                                        pago.moneda || turnoMoneda,
                                                        true
                                                      )}
                                                    </span>
                                                    <span className="cuota-monto-final">
                                                      Total a pagar: {formatCurrency(
                                                        montoPaciente,
                                                        pago.moneda || turnoMoneda,
                                                        true
                                                      )}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <span className="cuota-amount">
                                                    {formatCurrency(
                                                      pago.monto,
                                                      pago.moneda || turnoMoneda,
                                                      true
                                                    )}
                                                  </span>
                                                )}
                                                <small>
                                                  Método: {getPaymentMethodLabel(pago.metodo)}
                                                </small>
                                              </div>
                                              {tieneCobertura && (
                                                <div className="cuota-coverage">
                                                  <span>Obra social cubre</span>
                                                  <strong>
                                                    {formatCurrency(
                                                      cobertura,
                                                      pago.moneda || turnoMoneda,
                                                      true
                                                    )}
                                                  </strong>
                                                </div>
                                              )}
                                            </li>
                                          );
                                        })}
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
      {priceModalOpen && (
        <div
          className="pagos-modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={handleClosePriceModal}
        >
          <div
            className="pagos-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pagos-modal-header">
              <div>
                <h2>Actualizar precios de los turnos</h2>
                <p>
                  Configurá el valor base que se aplicará a los turnos programados
                  desde la fecha seleccionada en adelante.
                </p>
              </div>
              <button
                type="button"
                className="pagos-modal-close"
                onClick={handleClosePriceModal}
                disabled={priceSaving}
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="pagos-modal-body">
              {priceModalError && (
                <div className="pagos-modal-alert">{priceModalError}</div>
              )}

              <div className="pagos-modal-date">
                <label htmlFor="price-effective-date">Aplicar precios desde</label>
                <input
                  id="price-effective-date"
                  type="date"
                  value={priceEffectiveDate}
                  onChange={(event) => {
                    setPriceEffectiveDate(event.target.value);
                    setPriceModalError("");
                  }}
                  disabled={priceSaving}
                />
              </div>

              {priceModalLoading ? (
                <div className="pagos-modal-loading">Cargando profesiones…</div>
              ) : priceModalDepartamentos.length === 0 ? (
                <div className="pagos-modal-empty">
                  No se encontraron profesiones para ajustar.
                </div>
              ) : (
                <div className="pagos-modal-grid">
                  {priceModalDepartamentos.map((departamento) => (
                    <div key={departamento.id_departamento} className="pagos-modal-card">
                      <div className="pagos-modal-card-header">
                        <h3>{departamento.nombre}</h3>
                        {departamento.precio_actualizado_en && (
                          <small>
                            Último ajuste: {formatDateTime(departamento.precio_actualizado_en)}
                          </small>
                        )}
                      </div>
                      <div className="pagos-modal-card-body">
                        <div className="precio-actual">
                          <span>Precio actual</span>
                          <strong>
                            {formatCurrency(departamento.precio_actual, "ARS", true)}
                          </strong>
                        </div>
                        <div className="precio-nuevo">
                          <label htmlFor={`precio-nuevo-${departamento.id_departamento}`}>
                            Nuevo precio
                          </label>
                          <input
                            id={`precio-nuevo-${departamento.id_departamento}`}
                            type="text"
                            inputMode="decimal"
                            value={departamento.precio_nuevo}
                            onChange={(event) =>
                              handleChangeDepartamentoPrecio(
                                departamento.id_departamento,
                                event.target.value
                              )
                            }
                            disabled={priceSaving}
                            placeholder="Ej: 5000"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pagos-modal-footer">
              <button
                type="button"
                className="pagos-btn secondary"
                onClick={handleClosePriceModal}
                disabled={priceSaving}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="pagos-btn primary"
                onClick={handleApplyPriceChanges}
                disabled={priceSaving || priceModalLoading}
              >
                {priceSaving ? "Guardando…" : "Aplicar cambios"}
              </button>
            </div>
          </div>
        </div>
      )}
      <SelectPaymentMethodModal
        open={paymentModalState.open}
        title={paymentModalState.title}
        description={paymentModalState.description}
        defaultValue={paymentModalState.defaultValue}
        amountSummary={paymentModalState.amountSummary}
        submitting={modalSubmitting}
        onConfirm={handleConfirmPaymentMethod}
        onCancel={handleCancelPaymentMethod}
      />
    </>
  );
}
