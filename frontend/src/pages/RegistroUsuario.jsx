import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Registro from "../components/Registro";
import RegistroExitoso from "../components/RegistroExitoso";

const RegistroUsuario = () => {
  const [exito, setExito] = useState(false);
  const navigate = useNavigate();

  const handleClose = () => {
    navigate ("/");
  };

  return (
    <div className="registro-usuario-container">
      {!exito ? (
        <Registro onSuccess={() => setExito(true)} />
      ) : (
        <RegistroExitoso onClose={handleClose} />
      )}
    </div>
  );
};

export default RegistroUsuario;