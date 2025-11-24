import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import "../styles/PanelFinanciero.css";

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

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default function PanelFinanciero() {
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [filas, setFilas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const etiquetaMesActual = useMemo(
    () => `${MESES[mesSeleccionado]} ${anioSeleccionado}`,
    [mesSeleccionado, anioSeleccionado]
  );

  useEffect(() => {
    let cancelado = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await axios.get( 
          `${API_BASE_URL}/api/finanzas/resumen-mensual`,
          { params: { anio: anioSeleccionado } }
        );
        if (cancelado) return;
        const items = Array.isArray(data?.data) ? data.data : [];
        setFilas(items);
      } catch (err) {
        if (cancelado) return;
        console.error("Error cargando resumen financiero", err);
        setError("No se pudo cargar el resumen financiero.");
      } finally {
        if (!cancelado) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelado = true;
    };
  }, [anioSeleccionado]);

  const resumenActual = useMemo(() => {
    const encontrada = filas.find((f) => f.mes === etiquetaMesActual);
    return (
      encontrada || {
        mes: etiquetaMesActual,
        deberes: 0,
        haberes: 0,
        cobrosMesesAnteriores: 0,
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
            {currencyFormatter.format(resumenActual.deberes || 0)}
          </div>
          <p className="detalle">
            Turnos atendidos del mes que aún no fueron pagados.
          </p>
        </div>
        <div className="panel-card resumen-card haber">
          <div className="label">Ganancia bruta</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.haberes || 0)}
          </div>
          <p className="detalle">
            Total cobrado por turnos completados en el mes.
          </p>
        </div>
        <div className="panel-card resumen-card neta">
          <div className="label">Cobros de meses anteriores</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.cobrosMesesAnteriores || 0)}
          </div>
          <p className="detalle">
            Monto cobrado este mes por turnos realizados en meses anteriores.
          </p>
        </div>
        <div className="panel-card resumen-card neta">
          <div className="label">Ganancia neta</div>
          <div className="valor">
            {currencyFormatter.format(resumenActual.gananciaNeta || 0)}
          </div>
          <p className="detalle">
            Resultado final del mes. Por ahora coincide con la ganancia bruta y
            luego podrá descontar costos fijos y variables.
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
                  <th className="col-neta">Cobros de meses anteriores</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="col-mes">
                      Cargando resumen...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} className="col-mes">
                      {error}
                    </td>
                  </tr>
                ) : filas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="col-mes">
                      No hay datos para el año seleccionado.
                    </td>
                  </tr>
                ) : (
                  filas.map((fila) => (
                    <tr key={fila.id}>
                      <td className="col-mes">{fila.mes}</td>
                      <td className="col-debe">
                        {currencyFormatter.format(fila.deberes || 0)}
                      </td>
                      <td className="col-bruta">
                        {currencyFormatter.format(fila.haberes || 0)}
                      </td>
                      <td className="col-neta">
                        {currencyFormatter.format(
                          fila.cobrosMesesAnteriores || 0
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
