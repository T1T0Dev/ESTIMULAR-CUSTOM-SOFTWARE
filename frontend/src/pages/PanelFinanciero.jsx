import React, { useMemo, useState } from "react";
import "../styles/PanelFinanciero.css";

// Tabla puramente de presentación: los datos reales llegarán luego desde el backend.
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

const hoy = new Date();

// Datos de ejemplo para que la interfaz sea visualmente entendible.
const MOCK_DATA = [
  {
    id: "2025-11",
    mes: "Noviembre 2025",
    perdidas: 80000,
    gananciaBruta: 520000,
    gananciaNeta: 420000,
  },
  {
    id: "2025-10",
    mes: "Octubre 2025",
    perdidas: 45000,
    gananciaBruta: 480000,
    gananciaNeta: 390000,
  },
];

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default function PanelFinanciero() {
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());

  const etiquetaMesActual = useMemo(
    () => `${MESES[mesSeleccionado]} ${anioSeleccionado}`,
    [mesSeleccionado, anioSeleccionado]
  );

  // Más adelante esto se filtrará con datos reales; por ahora dejamos el mock visible.
  const filas = MOCK_DATA;

  const resumenActual = useMemo(() => {
    const encontrada = filas.find((f) => f.mes === etiquetaMesActual);
    return (
      encontrada || {
        mes: etiquetaMesActual,
        perdidas: 0,
        gananciaBruta: 0,
        gananciaNeta: 0,
      }
    );
  }, [filas, etiquetaMesActual]);

  return (
    <section className="panel-financiero-page">
      <div className="panel-financiero-top">
        <h1 className="panel-financiero-title">Panel financiero</h1>
        <div className="panel-financiero-filtros">
          <div className="filtro-select">
            <label htmlFor="filtro-mes">Mes</label>
            <select
              id="filtro-mes"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
            >
              {MESES.map((mes, index) => (
                <option key={mes} value={index}>
                  {mes}
                </option>
              ))}
            </select>
          </div>
          <div className="filtro-select">
            <label htmlFor="filtro-anio">Año</label>
            <select
              id="filtro-anio"
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            >
              {[
                anioSeleccionado - 1,
                anioSeleccionado,
                anioSeleccionado + 1,
              ].map((anio) => (
                <option key={anio} value={anio}>
                  {anio}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Resumen del mes actual */}
      <div className="panel-financiero-resumen">
        <div className="panel-card resumen-card debe">
          <div className="label">Deberes (turnos pendientes)</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.perdidas)}
          </div>
          <p className="detalle">
            Turnos atendidos del mes que aún no fueron pagados.
          </p>
        </div>
        <div className="panel-card resumen-card haber">
          <div className="label">Ganancia bruta</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.gananciaBruta)}
          </div>
          <p className="detalle">
            Total cobrado por turnos completados en el mes.
          </p>
        </div>
        <div className="panel-card resumen-card neta">
          <div className="label">Ganancia neta</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.gananciaNeta)}
          </div>
          <p className="detalle">
            Resultado final del mes luego de ajustes y egresos.
          </p>
        </div>
      </div>

      {/* Tabla histórica por mes */}
      <div className="panel-financiero-card-wrapper">
        <div className="panel-card panel-financiero-card">
          <div className="panel-card-header">
            <h2>Resumen mensual de caja</h2>
            <p className="panel-card-subtitle">
              Vista simple de pérdidas (deudores) y ganancias por mes, siguiendo
              criterio de caja.
            </p>
          </div>

          <div className="panel-table-wrapper">
            <table
              className="panel-table"
              aria-label="Resumen financiero por mes"
            >
              <thead>
                <tr>
                  <th className="col-mes">Mes</th>
                  <th className="col-debe">Deberes</th>
                  <th className="col-bruta">Ganancia bruta</th>
                  <th className="col-neta">Ganancia neta</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((fila) => (
                  <tr key={fila.id}>
                    <td className="col-mes">{fila.mes}</td>
                    <td className="col-debe">
                      {currencyFormatter.format(fila.perdidas)}
                    </td>
                    <td className="col-bruta">
                      {currencyFormatter.format(fila.gananciaBruta)}
                    </td>
                    <td className="col-neta">
                      {currencyFormatter.format(fila.gananciaNeta)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
