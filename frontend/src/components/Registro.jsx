import React, { useState } from "react";
import '../styles/Registro.css';
const profesiones = [
    "Médico",
    "Psicólogo",
    "Fonoaudiólogo",
    "Kinesiólogo",
    "Terapeuta Ocupacional",
    "Otro",
];

const roles = [
    { value: "profesional", label: "Profesional" },
    { value: "recepcionista", label: "Recepcionista" },
    { value: "administrador", label: "Administrador" },
    { value: "otro", label: "Otro" },
];

function Registro({ onSuccess }) {
    const [form, setForm] = useState({
        Nombre: "",
        Apellido: "",
        contra: "",
        rol: "",
        telefono: "",
        email: "",
        profesion: "",
    });
    const [error, setError] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(""); // Limpia errores previos

        // Validación simple de ejemplo
        if (form.contra.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres.");
            return;
        }
        // Aquí deberías hacer la petición al backend
        try {
            // Simulación de petición exitosa:
            // const response = await fetch("/api/registro", { ... });
            // if (!response.ok) throw new Error("Error en el registro");
            // await response.json();

            // Si todo sale bien:
            if (onSuccess) onSuccess();
        } catch (err) {
            setError("Ocurrió un error al registrar. Intenta nuevamente.");
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            {error && <div style={{ color: "red", marginBottom: 10 }}>{error}</div>}
            <div>
                <label>Nombre:</label>
                <input
                    type="text"
                    name="Nombre"
                    value={form.Nombre}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Apellido:</label>
                <input
                    type="text"
                    name="Apellido"
                    value={form.Apellido}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Contraseña:</label>
                <input
                    type="password"
                    name="contra"
                    value={form.contra}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Rol:</label>
                <select
                    name="rol"
                    value={form.rol}
                    onChange={handleChange}
                    required
                >
                    <option value="">Seleccione un rol</option>
                    {roles.map((rol) => (
                        <option key={rol.value} value={rol.value}>
                            {rol.label}
                        </option>
                    ))}
                </select>
            </div>
            {form.rol === "profesional" && (
                <div>
                    <label>Profesión:</label>
                    <select
                        name="profesion"
                        value={form.profesion}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Seleccione una profesión</option>
                        {profesiones.map((prof) => (
                            <option key={prof} value={prof}>
                                {prof}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            <div>
                <label>Teléfono:</label>
                <input
                    type="tel"
                    name="telefono"
                    value={form.telefono}
                    onChange={handleChange}
                    required
                />
            </div>
            <div>
                <label>Dirección de mail:</label>
                <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                />
            </div>
            <button type="submit">Registrarse</button>
        </form>
    );
}

export default Registro;