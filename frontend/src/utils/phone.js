export function normalizePhone(value) {
    if (value === undefined || value === null) return "";
    const digits = String(value).replace(/\D+/g, "");
    if (!digits) return "";

    let sanitized = digits;
    if (sanitized.startsWith("549") && sanitized.length >= 11) {
        sanitized = sanitized.slice(3);
    } else if (sanitized.startsWith("54") && sanitized.length >= 10) {
        sanitized = sanitized.slice(2);
    }

    if (sanitized.startsWith("0") && sanitized.length > 6) {
        sanitized = sanitized.slice(1);
    }

    return sanitized;
}

export function isPhoneValid(value, { min = 3, max = 15 } = {}) {
    const digits = normalizePhone(value);
    if (!digits) return false;
    return digits.length >= min && digits.length <= max;
}

export const PHONE_INPUT_HELPER = "Ingresá solo números sin espacios ni guiones (ej. 3813447120)";
