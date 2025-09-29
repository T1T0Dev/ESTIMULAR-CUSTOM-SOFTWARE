import { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

import "../styles/FormularioConsulta.css";


const MySwal = withReactContent(Swal);


export default function FormularioConsulta() {

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    servicio: "",
    mensaje: "",
  });

  const [status, setStatus] = useState(null);
  

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/contact/enviar-mail", form);

      if (res.data.success) {
        setStatus({ success: true, message: res.data.message });
        setForm({
          nombre: "",
          apellido: "",
          email: "",
          servicio: "",
          mensaje: "",
        })
        MySwal.fire({
          icon: 'success',
          title: 'Consulta enviada',
          text: 'Gracias por contactarnos, te responderemos a la brevedad.',
        });
      } else {
        setStatus({ success: false, message: res.data.message });
        MySwal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Hubo un problema al enviar tu consulta. Por favor, intenta nuevamente más tarde.',
        });
      }

    }
    catch (err) {
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
        <label className="content-form-label">Mensaje</label>
        <textarea
          name="mensaje"
          value={form.mensaje}
          onChange={handleChange}
          rows={4}
          required
          placeholder="Hola estoy interesado/a en..."
        />
        <p className="max-caracteres">
          {" "}
          Max 250 caracteres{" "}
        </p>
        <button type="submit" className="content-form-btn">
          Enviar
        </button>
      </form>
    </div>
  );
}
