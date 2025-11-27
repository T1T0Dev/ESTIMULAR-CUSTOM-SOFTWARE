import React, { useEffect, useState } from "react";
import {
  PAYMENT_METHODS,
  getPaymentMethodLabel,
} from "../constants/paymentMethods";
import "../styles/SelectPaymentMethodModal.css";

export default function SelectPaymentMethodModal({
  open,
  title,
  description,
  defaultValue = "",
  submitting = false,
  onConfirm,
  onCancel,
}) {
  const [selectedMethod, setSelectedMethod] = useState(defaultValue || "");

  useEffect(() => {
    if (open) {
      setSelectedMethod(defaultValue || "");
    }
  }, [open, defaultValue]);

  if (!open) {
    return null;
  }

  const handleConfirm = () => {
    if (!selectedMethod || typeof onConfirm !== "function") return;
    onConfirm(selectedMethod);
  };

  return (
    <div className="select-payment-modal-backdrop" role="dialog" aria-modal="true">
      <div className="select-payment-modal">
        <div className="select-payment-modal-header">
          <h3>{title || "Seleccionar método de pago"}</h3>
        </div>
        {description && <p className="select-payment-modal-description">{description}</p>}
        <label className="select-payment-modal-label" htmlFor="select-payment-method">
          Método de pago
        </label>
        <select
          id="select-payment-method"
          className="select-payment-modal-select"
          value={selectedMethod}
          onChange={(event) => setSelectedMethod(event.target.value)}
          disabled={submitting}
        >
          <option value="" disabled>
            Seleccionar método…
          </option>
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>
              {method.label}
            </option>
          ))}
        </select>
        {selectedMethod && (
          <p className="select-payment-modal-hint">
            Seleccionado: <strong>{getPaymentMethodLabel(selectedMethod)}</strong>
          </p>
        )}
        <div className="select-payment-modal-actions">
          <button
            type="button"
            className="select-payment-modal-btn secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="select-payment-modal-btn primary"
            onClick={handleConfirm}
            disabled={submitting || !selectedMethod}
          >
            {submitting ? "Registrando…" : "Confirmar"}
          </button>
        </div>
      </div>
    </div>
  );
}
