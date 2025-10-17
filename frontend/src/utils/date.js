// Utilidades para formateo de fechas en toda la app

/**
 * Formatea una fecha a DD/MM/YYYY.
 * Acepta: string ISO/"YYYY-MM-DD", Date, timestamp, o null/undefined.
 * Evita desfaces por zona horaria usando la parte de fecha cuando viene como string ISO.
 */
export function formatDateDMY(value) {
    if (!value) return "";

    // Si es string tipo 'YYYY-MM-DD' o ISO 'YYYY-MM-DDTHH:mm:ss...'
    if (typeof value === "string") {
        const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) {
            const [, y, mo, d] = m;
            return `${d}/${mo}/${y}`;
        }
        // Fallback: intentar parsear con Date
        const dt = new Date(value);
        if (!isNaN(dt)) {
            const dd = String(dt.getDate()).padStart(2, "0");
            const mm = String(dt.getMonth() + 1).padStart(2, "0");
            const yyyy = dt.getFullYear();
            return `${dd}/${mm}/${yyyy}`;
        }
        return "";
    }

    // Si es Date
    if (value instanceof Date) {
        if (isNaN(value)) return "";
        const dd = String(value.getDate()).padStart(2, "0");
        const mm = String(value.getMonth() + 1).padStart(2, "0");
        const yyyy = value.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    // Si es timestamp
    if (typeof value === "number") {
        const dt = new Date(value);
        if (isNaN(dt)) return "";
        const dd = String(dt.getDate()).padStart(2, "0");
        const mm = String(dt.getMonth() + 1).padStart(2, "0");
        const yyyy = dt.getFullYear();
        return `${dd}/${mm}/${yyyy}`;
    }

    return "";
}
