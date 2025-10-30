export function normalizeNinoRow(raw = {}) {
  const obraSocialSource =
    raw && typeof raw === "object" && raw.obra_social && typeof raw.obra_social === "object"
      ? raw.obra_social
      : null;

  const obraSocialNombre =
    obraSocialSource?.nombre_obra_social ??
    obraSocialSource?.nombre ??
    raw.paciente_obra_social ??
    null;

  const idObraSocial =
    raw.id_obra_social ??
    raw.paciente_obra_social_id ??
    obraSocialSource?.id_obra_social ??
    null;

  const certifiedValue =
    raw.certificado_discapacidad ?? raw.paciente_certificado_discapacidad;

  return {
    ...raw,
    id_nino: raw.id_nino ?? raw.paciente_id ?? raw.id ?? null,
    nombre: raw.nombre ?? raw.paciente_nombre ?? null,
    apellido: raw.apellido ?? raw.paciente_apellido ?? null,
    dni: raw.dni ?? raw.paciente_dni ?? null,
    fecha_nacimiento:
      raw.fecha_nacimiento ?? raw.paciente_fecha_nacimiento ?? null,
    certificado_discapacidad: Boolean(certifiedValue),
    tipo: raw.tipo ?? raw.paciente_tipo ?? null,
    id_obra_social: idObraSocial,
    obra_social:
      obraSocialSource ||
      (obraSocialNombre
        ? {
            id_obra_social: idObraSocial,
            nombre_obra_social: obraSocialNombre,
          }
        : null),
  };
}

export function extractRawNinosList(payload) {
  if (!payload) return [];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.items)) return payload.items;
  if (Array.isArray(payload)) return payload;
  if (payload.data && Array.isArray(payload.data.data)) {
    return payload.data.data;
  }
  return [];
}

export function getNinosTotal(payload, fallbackLength = 0) {
  if (!payload || typeof payload !== "object") return fallbackLength;
  if (typeof payload.total === "number") return payload.total;
  if (typeof payload.count === "number") return payload.count;
  if (typeof payload.data?.total === "number") return payload.data.total;
  return fallbackLength;
}

export function parseNinosResponse(responseData) {
  const payload = responseData ?? {};
  const rawList = extractRawNinosList(payload);
  const normalizedList = rawList.map((row) => normalizeNinoRow(row));
  const total = getNinosTotal(payload, normalizedList.length);
  return {
    rawList,
    list: normalizedList,
    total,
  };
}
