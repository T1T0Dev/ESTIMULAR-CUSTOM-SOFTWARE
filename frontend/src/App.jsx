import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { NotificacionProvider } from './context/NotificacionContext';

import Landing from './pages/Landing';
import Entrevista from "./pages/Entrevista";
import CandidatosEntrevista from "./pages/CandidatosEntrevista";
import Turnos from './pages/Turnos';

function App() {
  // Simular un ID de profesional logueado. Cambiar el valor en localStorage para probar.
  const loggedInProfesionalId = localStorage.getItem('profesionalId') || 1;

  return (
    <NotificacionProvider loggedInProfesionalId={loggedInProfesionalId}>
      <Router>
        <Routes>
          {/* Rutas publicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/formulario-entrevista" element={<Entrevista />} />
          <Route path="/candidatos-entrevista" element={<CandidatosEntrevista />} />
          <Route path="/turnos" element={<Turnos loggedInProfesionalId={loggedInProfesionalId} />} />
        </Routes>
      </Router>
    </NotificacionProvider>
  );
}

export default App;

