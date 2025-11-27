export const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta', label: 'Tarjeta' },
  { value: 'otro', label: 'Otro' },
];

export const UNASSIGNED_PAYMENT_METHOD = 'por_definir';

export function getPaymentMethodLabel(value) {
  if (!value || value === UNASSIGNED_PAYMENT_METHOD) {
    return 'Por definir';
  }

  const normalized = String(value).toLowerCase();
  const found = PAYMENT_METHODS.find(
    (method) => String(method.value).toLowerCase() === normalized,
  );

  return found?.label || value;
}
