import { useState } from "react";
import axios from "axios";

import "../styles/FormularioConsulta.css";

export default function FormularioConsulta() {
  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    servicio: "",
    comentario: "",
  });

  const [status, setStatus] = useState(null);
  

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    try {
      const res = await axios.post("http://localhost:3001/api/contact", form);

      if (res.data.success) {
        setStatus({ success: true, message: res.data.message });
        setForm({
          nombre: "",
          apellido: "",
          email: "",
          servicio: "",
          comentario: "",
        });
      } else {
        setStatus({ success: false, message: res.data.message });
      }
    } catch (err) {
      setStatus({
        success: false,
        message: err.response?.data?.message || "Error al enviar la consulta.",
      });
    }
  };

  return (
    <div>
      <form className="content-form" onSubmit={handleSubmit}>
        <div className="content-form-row">
          <div>
            <label className="content-form-label">Nombre</label>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Juan"
              required
            />
          </div>
          <div>
            <label className="content-form-label">Apellidos</label>
            <input
              type="text"
              name="apellido"
              value={form.apellido}
              onChange={handleChange}
              placeholder="Perez"
              required
            />
          </div>
        </div>
        <label className="content-form-label">Email</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="juanperez@gmail.com"
          required
        />
        <label className="content-form-label">Interesado en</label>
        <select
          name="servicio"
          value={form.servicio}
          onChange={handleChange}
          required
        >
          <option value="">Selecciona una opción</option>
          <option value="evaluacion">Evaluación diagnóstica inicial</option>
          <option value="terapia">Terapia individual</option>
          <option value="disponiblidad">
            Consultar disponibilidad de turnos
          </option>
          <option value="otros">Otros...</option>
        </select>
        <label className="content-form-label">Comentario</label>
        <textarea
          name="comentario"
          value={form.comentario}
          onChange={handleChange}
          rows={4}
          placeholder="Hola estoy interesado/a en..."
        />
        <p
          style={{ color: "red", textAlign: "right" }}
          className=" maximo-caracteres-label"
        >
          {" "}
          Max 250 caracteres{" "}
        </p>
        <button type="submit" className="content-form-btn">
          Enviar
        </button>
        {status && (
          <div className={status.success ? "success-message" : "error-message"}>
            {status.message}
          </div>
        )}
      </form>
    </div>
  );
}
