import React, { useState } from 'react'
import '../styles/FormularioLogin.css'

const FormularioLogin = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [dni, setDni] = useState('')
  const [password, setPassword] = useState('')

  // Validación para solo números y mínimo 7 dígitos
  const handleDniChange = (e) => {
    const value = e.target.value.replace(/\D/g, '') // Solo números
    if (value.length <= 15) setDni(value) // Limita a 15 dígitos si quieres
  }

  // Prevención básica de inyección y bloqueo de emojis/símbolos en contraseña
  const isPasswordSafe = (pwd) => {
    // Bloquea patrones comunes de inyección SQL
    const forbidden = [
      /('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i,
      /[\p{Emoji}\p{So}\p{Sk}]/gu // Bloquea emojis y símbolos
    ]
    return !forbidden.some((regex) => regex.test(pwd))
  }

  const togglePassword = (e) => {
    e.preventDefault()
    setShowPassword((prev) => !prev)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (dni.length < 7) {
      alert('El DNI debe tener al menos 7 números.')
      return
    }
    if (!isPasswordSafe(password)) {
      alert('La contraseña contiene caracteres no permitidos.')
      return
    }
    try {
      const response = await fetch('http://localhost:3001/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dni: dni,
          contrasena: password
        })
      })
      const data = await response.json()
      if (response.ok) {
        alert('Bienvenido')
        // Aquí puedes redirigir o guardar el usuario si lo necesitas
      } else {
        alert(data.error || 'Credenciales incorrectas')
      }
    } catch (error) {
      alert('Error de conexión')
    }
  }

  return (
    <div className="entrevista__formulario">
      <div className="formulario-login-box">
        <h1 className="formulario-login-title">Login</h1>
        <p className="formulario-login-subtitle">Ingresa los datos de tu cuenta</p>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="DNI"
            className="formulario-login-input"
            value={dni}
            onChange={handleDniChange}
            minLength={7}
            maxLength={15}
            pattern="\d{7,15}"
            inputMode="numeric"
            required
            title="Ingrese solo números (mínimo 7 dígitos)"
            autoComplete="off"
          />
          <div className="PadreBotonMostrarContraseña">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Contraseña"
              className="formulario-login-input"
              style={{ paddingRight: "40px" }}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="off"
            />
            <button className='BotonMostrarContraseña'
              onClick={togglePassword}
              tabIndex={-1}
              type="button"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? "👁️" : "🕵️"}
            </button>
          </div>
          <div className="formulario-login-olvidaste">
            <a href="#">¿Olvidaste tu contraseña?</a>
          </div>
          <button
            type="submit"
            className="formulario-login-boton"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  )
}

export default FormularioLogin