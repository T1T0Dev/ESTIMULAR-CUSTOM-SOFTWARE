import { useEffect, useMemo, useState } from "react";
import "../styles/ProfesionalesSelectorModal.css";

function normalizeId(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && !Number.isNaN(parsed) ? parsed : null;
}

function buildInitialSelections(propuestas = []) {
  const map = {};
  propuestas.forEach((propuesta) => {
    const deptId = normalizeId(propuesta?.departamento_id);
    if (!deptId) return;
    const initialIds = Array.isArray(propuesta?.profesional_ids)
      ? propuesta.profesional_ids
          .map((id) => normalizeId(id))
          .filter((id) => id !== null)
      : [];
    map[deptId] = Array.from(new Set(initialIds));
  });
  return map;
}

export default function ProfesionalesSelectorModal({
  isOpen,
  propuestas = [],
  onCancel = () => {},
  onConfirm = () => {},
}) {
  const [selecciones, setSelecciones] = useState(() => buildInitialSelections(propuestas));

  useEffect(() => {
    if (isOpen) {
      setSelecciones(buildInitialSelections(propuestas));
    } else {
      setSelecciones({});
    }
  }, [isOpen, propuestas]);

  const propuestasOrdenadas = useMemo(() => {
    const list = Array.isArray(propuestas) ? [...propuestas] : [];
    return list.sort((a, b) => {
      const nombreA = (a?.departamento_nombre || "").toLocaleLowerCase("es");
      const nombreB = (b?.departamento_nombre || "").toLocaleLowerCase("es");
      if (nombreA < nombreB) return -1;
      if (nombreA > nombreB) return 1;
      return 0;
    });
  }, [propuestas]);

  const toggleProfesional = (departamentoId, profesionalId) => {
    const deptKey = String(departamentoId);
    const profId = normalizeId(profesionalId);
    if (!profId) return;

    setSelecciones((prev) => {
      const current = new Set(prev[deptKey] || []);
      if (current.has(profId)) {
        current.delete(profId);
      } else {
        current.add(profId);
      }
      return {
        ...prev,
        [deptKey]: Array.from(current.values()).sort((a, b) => a - b),
      };
    });
  };

  const handleSelectSolo = (departamentoId, profesionalId) => {
    const deptKey = String(departamentoId);
    const profId = normalizeId(profesionalId);
    if (!profId) return;

    setSelecciones((prev) => ({
      ...prev,
      [deptKey]: [profId],
    }));
  };

  const canConfirm = useMemo(() => {
    return propuestasOrdenadas.every((propuesta) => {
      const deptKey = String(propuesta?.departamento_id);
      const seleccionActual = selecciones[deptKey] || [];
      const disponibles = Array.isArray(propuesta?.profesionales_disponibles)
        ? propuesta.profesionales_disponibles
        : [];
      if (disponibles.length === 0) {
        return true;
      }
      return seleccionActual.length > 0;
    });
  }, [propuestasOrdenadas, selecciones]);

  const handleConfirm = () => {
    if (!canConfirm) return;
    const actualizadas = propuestasOrdenadas.map((propuesta) => {
      const deptKey = String(propuesta?.departamento_id);
      const seleccionActual = selecciones[deptKey] || [];
      return {
        ...propuesta,
        profesional_ids: Array.from(new Set(seleccionActual)),
      };
    });
    onConfirm(actualizadas);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="profesionales-selector-overlay" role="dialog" aria-modal="true">
      <div className="profesionales-selector-panel">
        <div className="profesionales-selector-header">
          <h2>Seleccioná los profesionales por sector</h2>
          <p>
            Elegí uno o más profesionales para cada servicio. Podés reemplazar la sugerencia
            automática marcando o desmarcando las opciones disponibles.
          </p>
        </div>

        <div className="profesionales-selector-body">
          {propuestasOrdenadas.map((propuesta) => {
            const deptKey = String(propuesta?.departamento_id);
            const disponibles = Array.isArray(propuesta?.profesionales_disponibles)
              ? propuesta.profesionales_disponibles
              : [];
            const seleccionActual = selecciones[deptKey] || [];

            return (
              <section key={deptKey} className="profesionales-selector-section">
                <header className="profesionales-selector-section-header">
                  <h3>{propuesta?.departamento_nombre || "Servicio sin nombre"}</h3>
                  {propuesta?.duracion_min ? (
                    <span className="profesionales-selector-pill">
                      {propuesta.duracion_min} min
                    </span>
                  ) : null}
                </header>

                {disponibles.length === 0 ? (
                  <p className="profesionales-selector-empty">
                    No hay profesionales disponibles asociados a este servicio.
                  </p>
                ) : (
                  <ul className="profesionales-selector-list">
                    {disponibles.map((prof) => {
                      const profId = normalizeId(prof?.id_profesional);
                      const isChecked = seleccionActual.includes(profId);
                      const badges = [];
                      if (prof?.es_responsable) {
                        badges.push({ label: "Responsable", type: "responsable" });
                      }
                      if (prof?.es_admin) {
                        badges.push({ label: "Admin", type: "admin" });
                      }
                      if (prof?.seleccionado_por_defecto && !isChecked) {
                        badges.push({ label: "Sugerido", type: "suggested" });
                      }

                      return (
                        <li key={`${deptKey}-${profId}`} className="profesionales-selector-item">
                          <label className="profesionales-selector-option">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleProfesional(deptKey, profId)}
                            />
                            <span className="profesionales-selector-option-text">
                              <span className="profesionales-selector-prof-name">
                                {prof?.nombre_completo || `Profesional ${profId}`}
                              </span>
                              {badges.length > 0 && (
                                <span className="profesionales-selector-badges">
                                  {badges.map((badge) => (
                                    <span
                                      key={`${deptKey}-${profId}-${badge.type}`}
                                      className={`profesionales-selector-badge profesionales-selector-badge-${badge.type}`}
                                    >
                                      {badge.label}
                                    </span>
                                  ))}
                                </span>
                              )}
                            </span>
                          </label>
                          <button
                            type="button"
                            className="profesionales-selector-solo"
                            onClick={() => handleSelectSolo(deptKey, profId)}
                            aria-label="Seleccionar solo este profesional"
                          >
                            Solo este
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {disponibles.length > 0 && seleccionActual.length === 0 && (
                  <p className="profesionales-selector-warning">
                    Seleccioná al menos un profesional para continuar.
                  </p>
                )}
              </section>
            );
          })}
        </div>

        <div className="profesionales-selector-actions">
          <button type="button" className="profesionales-selector-button outline" onClick={onCancel}>
            Cancelar
          </button>
          <button
            type="button"
            className="profesionales-selector-button primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
