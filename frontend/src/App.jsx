import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Landing from "./pages/Landing";
import Entrevista from "./pages/Entrevista";
import DashboardLayout from "./layouts/DashboardLayout";
import Ninos from "./pages/Ninos";
import EditarProfesional from "./pages/EditarProfesional";
import ObrasSociales from "./pages/ObrasSociales";
import Responsables from "./pages/Responsables";
import EntrevistaPage from "./pages/Entrevista";
function App() {
  return (
    <div>
      <Router>
        <Routes>
          {/* Rutas publicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/formulario-entrevista" element={<Entrevista />} />
          <Route
            path="/dashboard/*"
            element={
              <DashboardLayout>
                <Routes>
                  <Route
                    path="/"
                    element={
                      <div className="p-24">Bienvenido al Dashboard</div>
                    }
                  />
                  <Route path="ninos" element={<Ninos />} />
                  <Route
                    path="editar-profesional"
                    element={<EditarProfesional />}
                  />
                  <Route
                    path="usuarios"
                    element={<div className="p-24">Usuarios (placeholder)</div>}
                  />
                  <Route
                    path="profesionales"
                    element={
                      <div className="p-24">Profesionales (placeholder)</div>
                    }
                  />
                  <Route
                    path="entrevistas"
                    element={
                      <div className="p-24">
                        Listado de entrevistas (placeholder)
                      </div>
                    }
                  />
                  <Route path="obras-sociales" element={<ObrasSociales />} />
                  <Route
                    path="turnos"
                    element={<div className="p-24">Turnos (placeholder)</div>}
                  />
                  <Route
                    path="pacientes"
                    element={
                      <div className="p-24">Pacientes (placeholder)</div>
                    }
                  />
                  <Route path="responsables" element={<Responsables />} />
                </Routes>
              </DashboardLayout>
            }
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
