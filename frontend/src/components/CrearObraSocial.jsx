import React, { useState } from "react";
import axios from "axios";
import API_BASE_URL from "../constants/api";
import Swal from "sweetalert2";
import "../styles/CrearObraSocial.css";

export default function CrearObraSocial({ onClose, estados = [], onCreated }) {
  const [nombre, setNombre] = useState("");
  const estadoOptions = (estados.length ? estados : ["pendiente"]).filter(
    (e) => e !== "todos"
  );
  const [estado, setEstado] = useState(estadoOptions[0] || "pendiente");

  const handleSave = async () => {
    if (!nombre.trim()) {
      Swal.fire({ icon: "warning", title: "Completa el nombre" });
      return;
    }
    try {
      Swal.fire({
        title: "Creando...",
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });
  await axios.post(`${API_BASE_URL}/api/obras-sociales`, {
        nombre_obra_social: nombre.trim(),
        estado,
      });
      Swal.close();
      Swal.fire({
        icon: "success",
        title: "Creado",
        timer: 1200,
        showConfirmButton: false,
      });
      if (typeof onCreated === "function") onCreated();
    } catch (err) {
      Swal.close();
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err?.response?.data?.message || "No se pudo crear",
      });
    }
  };

  return (
    <div className="os-modal-overlay" onClick={onClose}>
      <div className="os-modal" onClick={(e) => e.stopPropagation()}>
        <button className="os-modal-close" onClick={onClose}>
          &times;
        </button>
        <h2>Nueva obra social</h2>
        <div className="os-modal-section">
          <h3>Datos</h3>
          <div className="os-modal-row justify-start">
            <div className="w-100">
              <label className="sr-only" htmlFor="os-nombre">
                Nombre
              </label>
              <input
                id="os-nombre"
                className="os-edit-input"
                type="text"
                placeholder="Nombre de la obra social"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>
          <div className="os-modal-row justify-start">
            <div className="w-100">
              <label className="sr-only" htmlFor="os-estado">
                Estado
              </label>
              <select
                id="os-estado"
                className="os-edit-select"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
              >
                {estadoOptions.map((es) => (
                  <option key={es} value={es}>
                    {es}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="os-row-actions justify-end">
          <button className="os-btn os-save" onClick={handleSave}>
            Guardar
          </button>
          <button className="os-btn os-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
