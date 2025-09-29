import React from 'react';
import '../styles/RegistroExitoso.css';

function RegistroExitoso({ onClose }) {
    return (
        <div className="modal-overlay">
            <div className="modal-box">
                <h2>¡Registro Exitoso!</h2>
                <p>Tu cuenta ha sido creada correctamente.</p>
                <button onClick={onClose} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem' }}>
                    Cerrar
                </button>
            </div>
        </div>
    );
}

export default RegistroExitoso;